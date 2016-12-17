from flask import current_app as app, render_template, request, redirect, abort, jsonify, json as json_mod, url_for, session, Blueprint

shell = Blueprint('shell', __name__)

@challenges.route('/shell/', methods=['GET'])
def shell_view():
	if not authed():
		return redirect(url_for('auth.login', next=request.path))

	return render_template("shell.html")


