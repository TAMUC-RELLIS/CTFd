//http://stackoverflow.com/a/2648463 - wizardry!
String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

//http://stackoverflow.com/a/7616484
String.prototype.hashCode = function() {
    var hash = 0, i, chr, len;
    if (this.length == 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function loadchal(id, update) {
    // $('#chal *').show()
    // $('#chal > h1').hide()
    obj = $.grep(challenges['game'], function (e) {
        return e.id == id;
    })[0]
    $('#desc-write-link').click() // Switch to Write tab
    $('.chal-title').text(obj.name);
    $('.chal-name').val(obj.name);
    $('.chal-desc').val(obj.description);
    $('.chal-value').val(obj.value);
    $('.chal-category').val(obj.category);
    $('.chal-id').val(obj.id);
    if(!update){
        $('.chal-hidden').prop('checked', false);
        if (obj.hidden) {
            $('.chal-hidden').prop('checked', true);
        }
        $('.chal-instanced').prop('checked', false);
        if (obj.instanced) {
            $('.chal-instanced').prop('checked', true);
        }
        update_instance_ctrls();
    }
    //$('#update-challenge .chal-delete').attr({
    //    'href': '/admin/chal/close/' + (id + 1)
    //})
    if (typeof update === 'undefined')
        $('#update-challenge').modal();
}

function submitkey(chal, key) {
    $.post(script_root + "/admin/chal/" + chal, {
        key: key,
        nonce: $('#nonce').val()
    }, function (data) {
        alert(data)
    })
}

function loadkeys(chal){
    $.get(script_root + '/admin/keys/' + chal, function(data){
        $('#keys-chal').val(chal);
        keys = $.parseJSON(JSON.stringify(data));
        keys = keys['keys'];
        $('#current-keys').empty();
        for(x=0; x<keys.length; x++){
            var elem = $('<div class="col-md-4">');

            elem.append($("<div class='form-group'>").append($("<input class='current-key form-control' type='text'>").val(keys[x].key)));
            elem.append('<div class="radio-inline"><input type="radio" name="key_type['+x+']" value="0">Static</div>');
            elem.append('<div class="radio-inline"><input type="radio" name="key_type['+x+']" value="1">Regex</div>');
            elem.append('<a href="#" onclick="$(this).parent().remove()" class="btn btn-danger key-remove-button">Remove</a>');

            $('#current-keys').append(elem);
            $('#current-keys input[name="key_type['+x+']"][value="'+keys[x].type+'"]').prop('checked',true);
        }
    });
}

function updatekeys(){
    keys = [];
    vals = [];
    chal = $('#keys-chal').val()
    $('.current-key').each(function(){
        keys.push($(this).val());
    })
    $('#current-keys input[name*="key_type"]:checked').each(function(){
        vals.push($(this).val());
    })
    $.post(script_root + '/admin/keys/'+chal, {'keys':keys, 'vals':vals, 'nonce': $('#nonce').val()})
    loadchal(chal, true)
    $('#update-keys').modal('hide');
}

function loadtags(chal){
    $('#tags-chal').val(chal)
    $('#current-tags').empty()
    $('#chal-tags').empty()
    $.get(script_root + '/admin/tags/'+chal, function(data){
        tags = $.parseJSON(JSON.stringify(data))
        tags = tags['tags']
        for (var i = 0; i < tags.length; i++) {
            tag = "<span class='label label-primary chal-tag'><span>"+tags[i].tag+"</span><a name='"+tags[i].id+"'' class='delete-tag'>&#215;</a></span>"
            $('#current-tags').append(tag)
        };
        $('.delete-tag').click(function(e){
            deletetag(e.target.name)
            $(e.target).parent().remove()
        });
    });
}

function deletetag(tagid){
    $.post(script_root + '/admin/tags/'+tagid+'/delete', {'nonce': $('#nonce').val()});
}

function deletechal(chalid){
    $.post(script_root + '/admin/chal/delete', {'nonce':$('#nonce').val(), 'id':chalid});
}

function updatetags(){
    tags = [];
    chal = $('#tags-chal').val()
    $('#chal-tags > span > span').each(function(i, e){
        tags.push($(e).text())
    });
    $.post(script_root + '/admin/tags/'+chal, {'tags':tags, 'nonce': $('#nonce').val()})
    loadchal(chal)
}

function loadfiles(chal){
    $('#update-files form').attr('action', script_root+'/admin/files/'+chal)
    $.get(script_root + '/admin/files/' + chal, function(data){
        $('#files-chal').val(chal)
        files = $.parseJSON(JSON.stringify(data));
        files = files['files']
        $('#current-files').empty()
        for(x=0; x<files.length; x++){
            var elem = buildfile(files[x].file, files[x].id, chal);
            $('#current-files').append(elem);
        }
        loadinstances(chal); //Instances need to load after files
    });
}

function deletefile(chal, file, elem){
    $.post(script_root + '/admin/files/' + chal,{
        'nonce': $('#nonce').val(),
        'method': 'delete',
        'file': file
    }, function (data){
        if (data == "1") {
            elem.parent().parent().remove()
        }
    });
}

function loadinstances(chal){
    $.get(script_root + '/admin/instances/' + chal, function(data){
        $('#instances-chal').val(chal);
        instances = $.parseJSON(JSON.stringify(data));
        instances = instances['instances'];
        $('#current-instances').empty();
        for(x=0; x<instances.length; x++){
            var elem = buildinstance(instances[x]);
            $('#current-instances').append(elem);
        }
    });
}

function updateinstances(){
    var instances = [];
    chal = $('#instances-chal').val()
    $('.current-instance').each(function(){
        var inst = {};
        var filemappings = [];
        $(this).find('.filemapping-item.active').each(function(){
            var fileid = $(this).find('.file-id').val();
            filemappings.push(fileid);
        });
        inst["params"] = $(this).find(".instance-params").val();
        inst["filemappings"] = filemappings;
        inst["id"] = $(this).find(".instance-id").val();
        instances.push(JSON.stringify(inst));
    })
    $.post(script_root + '/admin/instances/'+chal, {'instances':instances, 'nonce': $('#nonce').val()})
    loadchal(chal, true)
    $('#update-instances').modal('hide');
    loadinstances(chal); // Ensure that the new IDs generated by the DB are loaded
}

function loadchals(){
    $('#challenges').empty();
    $.post(script_root + "/admin/chals", {
        'nonce': $('#nonce').val()
    }, function (data) {
        categories = [];
        challenges = $.parseJSON(JSON.stringify(data));


        for (var i = challenges['game'].length - 1; i >= 0; i--) {
            if ($.inArray(challenges['game'][i].category, categories) == -1) {
                categories.push(challenges['game'][i].category)
                $('#challenges').append($('<tr id="' + challenges['game'][i].category.replace(/ /g,"-").hashCode() + '"><td class="col-md-1"><h3>' + challenges['game'][i].category + '</h3></td></tr>'))
            }
        };

        for (var i = 0; i <= challenges['game'].length - 1; i++) {
            var chal = challenges['game'][i]
            var chal_button = $('<button class="chal-button col-md-2 theme-background" value="{0}"><h5>{1}</h5><p class="chal-points">{2}</p><span class="chal-percent">{3}% solved</span></button>'.format(chal.id, chal.name, chal.value, Math.round(chal.percentage_solved * 100)));
            $('#' + challenges['game'][i].category.replace(/ /g,"-").hashCode()).append(chal_button);
        };

        $('#challenges button').click(function (e) {
            loadchal(this.value);
            loadkeys(this.value);
            loadtags(this.value);
            loadfiles(this.value);
        });

        $('.create-challenge').click(function (e) {
            $('#new-chal-category').val($($(this).siblings()[0]).text().trim());
            $('#new-chal-title').text($($(this).siblings()[0]).text().trim());
            $('#new-challenge').modal();
        });

    });
}

$('#submit-key').click(function (e) {
    submitkey($('#chalid').val(), $('#answer').val())
});

$('#submit-keys').click(function (e) {
    e.preventDefault();
    updatekeys();
});

$('#submit-tags').click(function (e) {
    e.preventDefault();
    updatetags();
});

$('#submit-instances').click(function (e) {
    e.preventDefault();
    updateinstances();
});

$('#delete-chal form').submit(function(e){
    e.preventDefault();
    $.post(script_root + '/admin/chal/delete', $(this).serialize(), function(data){
        console.log(data)
        if (data){
            loadchals();
        }
        else {
            alert('There was an error');
        }
    })
    $("#delete-chal").modal("hide");
    $("#update-challenge").modal("hide");
});

$(".tag-insert").keyup(function (e) {
    if (e.keyCode == 13) {
        tag = $('.tag-insert').val()
        tag = tag.replace(/'/g, '');
        if (tag.length > 0){
            tag = "<span class='label label-primary chal-tag'><span>"+tag+"</span><a class='delete-tag' onclick='$(this).parent().remove()'>&#215;</a></span>"
            $('#chal-tags').append(tag)
        }
        $('.tag-insert').val("")
    }
});



// Markdown Preview
$('#desc-edit').on('shown.bs.tab', function (event) {
    if (event.target.hash == '#desc-preview'){
        $(event.target.hash).html(marked($('#desc-editor').val(), {'gfm':true, 'breaks':true}))
    }
});
$('#new-desc-edit').on('shown.bs.tab', function (event) {
    if (event.target.hash == '#new-desc-preview'){
        $(event.target.hash).html(marked($('#new-desc-editor').val(), {'gfm':true, 'breaks':true}))
    }
});

// Open New Challenge modal when New Challenge button is clicked
$('.create-challenge').click(function (e) {
    $('#create-challenge').modal();
});


$('#create-key').click(function(e){
    var amt = $('#current-keys input[type=text]').length

    var elem = $('<div class="col-md-4">');

    elem.append($("<div class='form-group'>").append($("<input class='current-key form-control' type='text'>")));
    elem.append('<div class="radio-inline"><input type="radio" name="key_type['+amt+']" value="0" checked>Static</div>');
    elem.append('<div class="radio-inline"><input type="radio" name="key_type['+amt+']" value="1">Regex</div>');
    elem.append('<a href="#" onclick="$(this).parent().remove()" class="btn btn-danger key-remove-button">Remove</a>');

    $('#current-keys').append(elem);
});

$('#create-instance').click(function(e){
    elem = buildinstance();
    $('#current-instances').append(elem);
});

function update_instance_ctrls(){
    if($('.chal-instanced').is(":checked")){  
        $(".instance-ctrl").show();
    }
    else {
        $(".instance-ctrl").hide();
    }
}

function buildfile(filepath, id, chal){
    filename = filepath.split('/')
    filename = filename[filename.length - 1]
    var elem = $('<div class="row current-file" style="margin:5px 0px;">');
    elem.append('<a class="file-link" style="position:relative;top:10px;" href='+script_root+'/files/'+filepath+'>'+filename+'</a>');

    var form_group = $('<div class="form-group" style="float: right">');
    form_group.append('<a href="#" class="btn btn-danger" onclick="deletefile('+chal+','+id+', $(this))" value="'+id+'" style="float:right;">Delete</a>');
    elem.append(form_group);
    elem.append($("<input class='file-id' type='hidden'>").val(id));
    return elem;
}

function buildinstance(instance=null){
    var instid = 0;
    var params = "";
    var filemappings = [];
    if(instance===null){
        instid = -1; // Negative instid indicates that this instance is new and needs an id
    }
    else{
        instid = instance.id;
        params = instance.params;
        filemappings = instance.filemappings;
    }
    var elem = $('<div class="col-md-12 row current-instance">');
    
    var textbox = $("<div class='form-group col-md-8'>");
    textbox.append($("<input class='instance-params form-control' type='text' placeholder='Template parameters (JSON)'>").val(params))
    textbox.append($("<input class='instance-id' type='hidden'>").val(instid));
    elem.append(textbox)

    var buttons = $('<div class="form-group col-md-4">');
    var dropdown = $('<div class="dropdown">');
    dropdown.append('<button class="btn btn-default dropdown-toggle" type="button" id="filemapping_dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">Mapped files<span class="caret"></span></button>');
    var options = $('<ul class="dropdown-menu" aria-labelledby="filemapping_dropdown">');

    $('.current-file').each(function(){
        filename_btn = $('<li class="filemapping-item"><a href="#"><span class="fa fa-square-o" aria-hidden="true"></span><span class="fa fa-check-square-o" aria-hidden="true"></span> '+$(this).find('.file-link').text()+'</a></li>');
        filename_btn.click(function(e){
            if($(this).hasClass('active')){
                $(this).removeClass('active');
                $(this).find('.fa-check-square-o').hide();
                $(this).find('.fa-square-o').show();
            }
            else{
                $(this).addClass('active');
                $(this).find('.fa-check-square-o').show();
                $(this).find('.fa-square-o').hide();
            }
            e.stopPropagation();
        })
        filename_btn.find('.fa-check-square-o').hide();
        var fileid = parseInt($(this).find('.file-id').val());
        if($.inArray(fileid, filemappings) > -1){
            filename_btn.click();
        }
        filename_btn.append($("<input class='file-id' type='hidden'>").val(fileid));
        options.append(filename_btn);
    });
    if(options.children().length == 0){
        options.append('<li>&nbsp; No files uploaded</li>');
    }

    dropdown.append(options);
    buttons.append(dropdown);
    buttons.append('<a href="#" onclick="$(this).parent().parent().remove()" class="btn btn-danger pull-right instance-remove-button">Remove</a>');
    elem.append(buttons);
    return elem;
}

$(function(){
    loadchals();
})
