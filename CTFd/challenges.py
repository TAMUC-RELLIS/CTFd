import logging
import re
import time
import imp
import os
import json

from flask import current_app as app, render_template, request, redirect, jsonify, json as json_mod, url_for, session, Blueprint

from CTFd.utils import ctftime, view_after_ctf, authed, unix_time, get_kpm, user_can_view_challenges, is_admin, get_config, get_ip, is_verified, ctf_started, ctf_ended, ctf_name
from CTFd.models import db, Challenges, Files, Solves, WrongKeys, FileMappings, Instances, Tags, Teams, Awards

from sqlalchemy.sql import or_

from jinja2 import Template
from binascii import crc32

challenges = Blueprint('challenges', __name__)


def hash_choice(items, keys):
    code = ""
    for k in keys:
        code += str(crc32(str(k)))
    index = crc32(code) % len(items)
    return items[index]


def choose_instance(chalid):
    instances = Instances.query.filter_by(chal=chalid) \
                         .order_by(Instances.id.asc()).all()
    instance = None
    if instances:
        hash_keys = [session.get('id'), chalid]
        instance = hash_choice(instances, hash_keys)
    else:
        print("ERROR: No instances found for challenge id {}".format(chalid))
    return instance


def from_instance(chal_id):
    instance = choose_instance(chal_id)

    params = {}
    files = []

    if instance:
        try:
            params = json_mod.loads(instance.params)
        except ValueError:
            print("ERROR: JSON decode eror on string: {}".format(instance.params))

        filemap_query = FileMappings.query.filter_by(instance=instance.id)
        fileids = [mapping.file for mapping in filemap_query.all()]

        file_query = Files.query.filter(Files.id.in_(fileids))
        files = [str(f.location) for f in file_query.all()]


    return params, files


def dispatch_generator(generator):
    gen_folder = os.path.join(os.path.normpath(app.root_path), app.config['GENERATOR_FOLDER'])
    gen_script = os.path.join(gen_folder, generator)

    params = {}
    files = []

    if os.path.isfile(gen_script):
        hash = 0
        with open(gen_script, 'r') as f:
            hash = crc32(f.read()) & 0xffffffff
        gen_name = "generator_{:08x}".format(hash)
        print("Importing ({}, {})".format(gen_name, gen_script))

        gen_module = None
        gen_script_dir, gen_script_name = os.path.split(gen_script)

        try:
            gen_module = imp.load_source(gen_name, gen_script)
        except Exception as e:
            print("Importing generator module from {} failed with exception {}".format(gen_script, e))
        except:
            print("Non-exception object raised while importing from {}".format(gen_script))

        if gen_module:
            if hasattr(gen_module, 'gen_config'):
                try:
                    params, files = gen_module.gen_config(session['id'])
                except Exception as e:
                    print("Execution of generator module from {} failed with exception {}".format(gen_script, e))
                except:
                    print("Non-exception object raised while executing module from {}".format(gen_script))
                if files:
                    file_path_prefix = os.path.relpath(gen_script_dir, start=gen_folder)
                    files = [os.path.normpath(os.path.join(file_path_prefix, file)) for file in files]
            else:
                print("Generator module from {} missing gen_config function".format(gen_script))
    else:
        print("ERROR: Generator script '{}' not found".format(gen_script))

    return params, files

def update_generated_files(chalid, files):
    files_db_objs = Files.query.add_columns('location').filter_by(chal=chalid).all()
    files_db = [f.location for f in files_db_objs]
    for file in files:
        if file not in files_db:
            db.session.add(Files(chalid, file, True))
    db.session.commit()


@challenges.route('/challenges', methods=['GET'])
def challenges_view():
    errors = []
    start = get_config('start') or 0
    end = get_config('end') or 0
    if not is_admin():  # User is not an admin
        if not ctftime():
            # It is not CTF time
            if view_after_ctf():  # But we are allowed to view after the CTF ends
                pass
            else:  # We are NOT allowed to view after the CTF ends
                if get_config('start') and not ctf_started():
                    errors.append('{} has not started yet'.format(ctf_name()))
                if (get_config('end') and ctf_ended()) and not view_after_ctf():
                    errors.append('{} has ended'.format(ctf_name()))
                return render_template('chals.html', errors=errors, start=int(start), end=int(end))
        if get_config('verify_emails') and not is_verified():  # User is not confirmed
            return redirect(url_for('auth.confirm_user'))
    if user_can_view_challenges():  # Do we allow unauthenticated users?
        if get_config('start') and not ctf_started():
            errors.append('{} has not started yet'.format(ctf_name()))
        if (get_config('end') and ctf_ended()) and not view_after_ctf():
            errors.append('{} has ended'.format(ctf_name()))
        return render_template('chals.html', errors=errors, start=int(start), end=int(end))
    else:
        return redirect(url_for('auth.login', next='challenges'))


@challenges.route('/chals', methods=['GET'])
def chals():
    if not is_admin():
        if not ctftime():
            if view_after_ctf():
                pass
            else:
                return redirect(url_for('views.static_html'))
    if user_can_view_challenges() and (ctf_started() or is_admin()):
        columns = ('id', 'name', 'value', 'description', 'category',
                   'instanced', 'generated', 'generator')
        hidden_flt = or_(Challenges.hidden is not True, Challenges.hidden is None)
        chals = Challenges.query.filter(hidden_flt).add_columns(*columns)
        chals = chals.order_by(Challenges.value).all()

        game = []

        for chal in chals:

            tags_query = Tags.query.add_columns('tag').filter_by(chal=chal.name)
            tags = [tag.tag for tag in tags_query.all()]

            name = chal.name
            desc = chal.description

            if chal.instanced:
                if chal.generated:
                    params, files = dispatch_generator(chal.generator)
                    update_generated_files(chal.id, files)
                else:
                    params, files = from_instance(chal.id)

                name = Template(chal.name).render(params)
                desc = Template(chal.description).render(params)

            else:
                files_query = Files.query.filter_by(chal=chal.id)
                files = [str(f.location) for f in files_query.all()]

            game.append({'id': chal.id, 'name': name, 'tags': tags,
                         'description': desc, 'value': chal.value,
                         'files': files, 'category': chal.category})

        db.session.close()
        return jsonify({'game': game})
    else:
        db.session.close()
        return redirect(url_for('auth.login', next='chals'))


@challenges.route('/chals/solves')
def solves_per_chal():
    if not user_can_view_challenges():
        return redirect(url_for('auth.login', next=request.path))
    solves_counter = db.func.count(Solves.chalid).label('solves')
    solves_sub = db.session.query(Solves.chalid, solves_counter) \
                           .join(Teams, Solves.teamid == Teams.id) \
                           .filter(not Teams.banned) \
                           .group_by(Solves.chalid).subquery()

    solves = db.session.query(solves_sub.columns.chalid, solves_sub.columns.solves, Challenges.name) \
                       .join(Challenges, solves_sub.columns.chalid == Challenges.id).all()
    json = {}
    for chal, count, name in solves:
        json[chal] = count
    db.session.close()
    return jsonify(json)


@challenges.route('/solves')
@challenges.route('/solves/<int:teamid>')
def solves(teamid=None):
    solves = None
    awards = None
    if teamid is None:
        if is_admin():
            solves = Solves.query.filter_by(teamid=session['id']).all()
        elif user_can_view_challenges():
            solves = Solves.query.join(Teams, Solves.teamid == Teams.id) \
                           .filter(Solves.teamid == session['id'], not Teams.banned).all()
        else:
            return redirect(url_for('auth.login', next='solves'))
    else:
        solves = Solves.query.filter_by(teamid=teamid).all()
        awards = Awards.query.filter_by(teamid=teamid).all()
    db.session.close()
    json = {'solves': []}
    for solve in solves:
        json['solves'].append({
            'chal': solve.chal.name,
            'chalid': solve.chalid,
            'team': solve.teamid,
            'value': solve.chal.value,
            'category': solve.chal.category,
            'time': unix_time(solve.date)
        })
    if awards:
        for award in awards:
            json['solves'].append({
                'chal': award.name,
                'chalid': None,
                'team': award.teamid,
                'value': award.value,
                'category': award.category,
                'time': unix_time(award.date)
            })
    json['solves'].sort(key=lambda k: k['time'])
    return jsonify(json)


@challenges.route('/maxattempts')
def attempts():
    if not user_can_view_challenges():
        return redirect(url_for('auth.login', next=request.path))
    chals = Challenges.query.add_columns('id').all()
    json = {'maxattempts': []}
    for chal, chalid in chals:
        fails = WrongKeys.query.filter_by(teamid=session['id'], chalid=chalid).count()
        if fails >= int(get_config("max_tries")) and int(get_config("max_tries")) > 0:
            json['maxattempts'].append({'chalid': chalid})
    return jsonify(json)


@challenges.route('/fails/<int:teamid>', methods=['GET'])
def fails(teamid):
    fails = WrongKeys.query.filter_by(teamid=teamid).count()
    solves = Solves.query.filter_by(teamid=teamid).count()
    db.session.close()
    json = {'fails': str(fails), 'solves': str(solves)}
    return jsonify(json)


@challenges.route('/chal/<int:chalid>/solves', methods=['GET'])
def who_solved(chalid):
    if not user_can_view_challenges():
        return redirect(url_for('auth.login', next=request.path))
    solves = Solves.query.join(Teams, Solves.teamid == Teams.id) \
                   .filter(Solves.chalid == chalid, not Teams.banned) \
                   .order_by(Solves.date.asc())
    json = {'teams': []}
    for solve in solves:
        json['teams'].append({'id': solve.team.id, 'name': solve.team.name, 'date': solve.date})
    return jsonify(json)


@challenges.route('/chal/<int:chalid>', methods=['POST'])
def chal(chalid):
    if ctf_ended() and not view_after_ctf():
        return redirect(url_for('challenges.challenges_view'))
    if not user_can_view_challenges():
        return redirect(url_for('auth.login', next=request.path))
    if authed() and is_verified() and (ctf_started() or view_after_ctf()):
        fails = WrongKeys.query.filter_by(teamid=session['id'], chalid=chalid).count()
        logger = logging.getLogger('keys')
        data = (time.strftime("%m/%d/%Y %X"), session['username'].encode('utf-8'), request.form['key'].encode('utf-8'), get_kpm(session['id']))
        print("[{0}] {1} submitted {2} with kpm {3}".format(*data))

        # Anti-bruteforce / submitting keys too quickly
        if get_kpm(session['id']) > 10:
            if ctftime():
                wrong = WrongKeys(session['id'], chalid, request.form['key'])
                db.session.add(wrong)
                db.session.commit()
                db.session.close()
            logger.warn("[{0}] {1} submitted {2} with kpm {3} [TOO FAST]".format(*data))
            # return '3' # Submitting too fast
            return jsonify({'status': '3', 'message': "You're submitting keys too fast. Slow down."})

        solves = Solves.query.filter_by(teamid=session['id'], chalid=chalid).first()

        # Challange not solved yet
        if not solves:
            chal = Challenges.query.filter_by(id=chalid).first_or_404()
            key = unicode(request.form['key'].strip().lower())
            keys = json.loads(chal.flags)

            # Hit max attempts
            max_tries = int(get_config("max_tries"))
            if fails >= max_tries > 0:
                return jsonify({
                    'status': '0',
                    'message': "You have 0 tries remaining"
                })

            instance = None
            if chal.instanced:
                instance = choose_instance(chal.id)

            for x in keys:
                if chal.instanced:
                    params = {}
                    if instance:
                        try:
                            params = json_mod.loads(instance.params)
                        except ValueError:
                            print("JSON decode eror on string: {}".format(instance.params))
                    rendered_flag = Template(x['flag']).render(params)
                    print "Key template '{}' render to '{}'".format(x['flag'], rendered_flag)
                    x['flag'] = rendered_flag

                if x['type'] == 0:  # static key
                    # A consequence of the line below is that the flag must not be empty string. If this is the case, the problem is unsolvable
                    if x['flag'] and x['flag'].strip().lower() == key.strip().lower():
                        if ctftime():
                            solve = Solves(chalid=chalid, teamid=session['id'], ip=get_ip(), flag=key)
                            db.session.add(solve)
                            db.session.commit()
                            db.session.close()
                        logger.info("[{0}] {1} submitted {2} with kpm {3} [CORRECT]".format(*data))
                        # return '1' # key was correct
                        return jsonify({'status': '1', 'message': 'Correct'})
                elif x['type'] == 1:  # regex
                    res = re.match(x['flag'], key, re.IGNORECASE)
                    if res and res.group() == key:
                        if ctftime():
                            solve = Solves(chalid=chalid, teamid=session['id'], ip=get_ip(), flag=key)
                            db.session.add(solve)
                            db.session.commit()
                            db.session.close()
                        logger.info("[{0}] {1} submitted {2} with kpm {3} [CORRECT]".format(*data))
                        # return '1' # key was correct
                        return jsonify({'status': '1', 'message': 'Correct'})

            if ctftime():
                wrong = WrongKeys(session['id'], chalid, request.form['key'])
                db.session.add(wrong)
                db.session.commit()
                db.session.close()
            logger.info("[{0}] {1} submitted {2} with kpm {3} [WRONG]".format(*data))
            # return '0' # key was wrong
            if max_tries:
                attempts_left = max_tries - fails
                tries_str = 'tries'
                if attempts_left == 1:
                    tries_str = 'try'
                return jsonify({'status': '0', 'message': 'Incorrect. You have {} {} remaining.'.format(attempts_left, tries_str)})
            else:
                return jsonify({'status': '0', 'message': 'Incorrect'})

        # Challenge already solved
        else:
            logger.info("{0} submitted {1} with kpm {2} [ALREADY SOLVED]".format(*data))
            # return '2' # challenge was already solved
            return jsonify({'status': '2', 'message': 'You already solved this'})
    else:
        return '-1'
