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
    // $('.chal-discoveryList').val(obj.discovery); //HERE
    $('.chal-hint').val(obj.hint);
    $('.chal-hidden').prop('checked', false);
    if (obj.hidden) {
        $('.chal-hidden').prop('checked', true);
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

function loaddiscoveryList(chal){
    $('#discoveryList-chal').val(chal)
    $('#current-discoveryList').empty()
    $('#chal-discoveryList').empty()
    $.get(script_root + '/admin/discoveryList/'+chal, function(data){
        discoveryList = $.parseJSON(JSON.stringify(data))
        discoveryList = discoveryList['discoveryList']
        for (var i = 0; i < discoveryList.length; i++) {
            discovery = "<span class='label label-primary chal-discovery'><span>"+discoveryList[i].discovery+"</span><a name='"+discoveryList[i].id+"'' class='delete-discovery'>&#215;</a></span>"
            $('#current-discoveryList').append(discovery)
        };
        $('.delete-discovery').click(function(e){
            deletediscovery(e.target.name)
            $(e.target).parent().remove()
        });
    });
}

function loadhint(chal){
    $('#hint-chal').val(chal)
    $('#current-hint').empty()
    $('#chal-hint').empty()
    $.get(script_root + '/admin/hint/'+chal, function(data){
        hint = $.parseJSON(JSON.stringify(data))
        hint = hint['hint']
        for (var i = 0; i < hint.length; i++) {
            hint = "<span class='label label-primary chal-hint'><span>"+hint[i].hint+"</span><a name='"+hint[i].id+"'' class='delete-hint'>&#215;</a></span>"
            $('#current-hint').append(hint)
        };
        $('.delete-hint').click(function(e){
            deletehint(e.target.name)
            $(e.target).parent().remove()
        });
    });
}

function deletetag(tagid){
    $.post(script_root + '/admin/tags/'+tagid+'/delete', {'nonce': $('#nonce').val()});
}

function deletehint(hintid){
    $.post(script_root + '/admin/hint/'+hintid+'/delete', {'nonce': $('#nonce').val()});
}

function deletediscovery(discoveryid){
    $.post(script_root + '/admin/discoveryList/'+discoveryid+'/delete', {'nonce': $('#nonce').val()});
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

function updatehint(){
    hint = [];
    chal = $('#hint-chal').val()
    $('#chal-hint > span > span').each(function(i, e){
        hint.push($(e).text())
    });
    $.post(script_root + '/admin/hint/'+chal, {'hint':hint, 'nonce': $('#nonce').val()})
    loadchal(chal)
}

function updatediscoveryList(){
    discoveryList = [];
    chal = $('#discoveryList-chal').val()
    $('#chal-discoveryList > span > span').each(function(i, e){
        discoveryList.push($(e).text())
    });
    $.post(script_root + '/admin/discoveryList/'+chal, {'discoveryList':discoveryList, 'nonce': $('#nonce').val()})
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
            filename = files[x].file.split('/')
            filename = filename[filename.length - 1]
            $('#current-files').append('<div class="row" style="margin:5px 0px;">'+'<a style="position:relative;top:10px;" href='+script_root+'/files/'+files[x].file+'>'+filename+'</a><a href="#" class="btn btn-danger" onclick="deletefile('+chal+','+files[x].id+', $(this))" value="'+files[x].id+'" style="float:right;">Delete</a></div>')
        }
    });
}

function deletefile(chal, file, elem){
    $.post(script_root + '/admin/files/' + chal,{
        'nonce': $('#nonce').val(),
        'method': 'delete',
        'file': file
    }, function (data){
        if (data == "1") {
            elem.parent().remove()
        }
    });
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
            loaddiscoveryList(this.value);
            loadhint(this.value);
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
    updatekeys()
});

$('#submit-tags').click(function (e) {
    e.preventDefault();
    updatetags()
});

$('#submit-hint').click(function (e) {
    e.preventDefault();
    updatehint()
});

$('#submit-discoveryList').click(function (e) {
    e.preventDefault();
    updatediscoveryList()
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

$(".hint-insert").keyup(function (e) {
    if (e.keyCode == 13) {
        hint = $('.hint-insert').val()
        hint = hint.replace(/'/g, '');
        if (hint.length > 0){
            hint = "<span class='label label-primary chal-hint'><span>"+hint+"</span><a class='delete-hint' onclick='$(this).parent().remove()'>&#215;</a></span>"
            $('#chal-hint').append(hint)
        }
        $('.hint-insert').val("")
    }
});

$(".discovery-insert").keyup(function (e) {
    if (e.keyCode == 13) {
        discovery = $('.discovery-insert').val()
        discovery = discovery.replace(/'/g, '');
        if (discovery.length > 0){
            discovery = "<span class='label label-primary chal-discovery'><span>"+discovery+"</span><a class='delete-discovery' onclick='$(this).parent().remove()'>&#215;</a></span>"
            $('#chal-discoveryList').append(discovery)
        }
        $('.discovery-insert').val("")
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

$('#create-discovery').click(function(e){
    elem = builddiscovery();
    $('#current-discoveryList').append(elem);
    setSubmitDiscBtnStatus()
});

function setSubmitDiscBtnStatus(){
    var isValid = true;
    var failureIndices = [];
    $(".params-input-group").each(function(i){
        if($(this).hasClass("has-error")){
            isValid = false;
            failureIndices.push(i);
        }
    });
    if(isValid){
        $("#submit-discoveryList").removeClass("disabled");
        $("#submit-discoveryList").css("pointer-events", "auto");
        $("#discovery-error-notification").slideUp();
    }
    else{
        $("#submit-discoveryList").addClass("disabled");
        $("#submit-discoveryList").css("pointer-events", "none");
        $("#discovery-error-notification").slideDown();
    }
    return isValid;
}

function builddiscovery(){
  
    var discoveryList = []
    x = $(".chal-button")
    
    console.log("List of Challenges");
    console.log(x);
    
    $(".chal-button").each(function(){
      // if(discoveryList.indexOf(this) == -1){
          // $(discoveryList).append(this.value);
          // $(this).addClass('current-chal');
          
      // } else{
      console.log("Well...");
      $(".chal-button h5").each(function(){
        console.log("d...");
        console.log(this.firstChild);
      });
      // }
    });
    
     
    var elem = $('<div class="col-md-12 row current-discovery">');
        
    var buttons = $('<div class="btn-group col-md-5" role="group">');
    var dropdown = $('<div class="btn-group dropdown" role="group">');
    dropdown.append('<button class="btn btn-default dropdown-toggle" type="button" id="discovery_dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><span class="chal-quantity">0</span> Challenges<span class="chal-plural">s</span> <span class="caret"></span></button>');
    var options = $('<ul class="dropdown-menu" aria-labelledby="discovery_dropdown">');
    dropdown.append(options);
    buttons.append(dropdown);
    
    $('.chal-button').each(function(){
        add_discovery = $('<li class="discovery-item"><a href="#"><span class="fa fa-square-o" aria-hidden="true"></span><span class="fa fa-check-square-o" aria-hidden="true"></span> '+$(this).val()+': '+this.firstChild.innerText+'</a></li>');
        add_discovery.click(function(e){
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
            var numActive = $(this).parent().find(".active").length;
            $(this).parent().parent().find(".chal-quantity").text(numActive.toString());
            if(numActive == 1){
                $(this).parent().parent().find(".chal-plural").html("&nbsp;");
            }
            else {
                $(this).parent().parent().find(".chal-plural").html("s");
            }
            e.stopPropagation();
        })
        add_discovery.find('.fa-check-square-o').hide();

        var chalid = parseInt($(this).find('.chal-button').value);
        add_discovery.append($("<input class='chal-link' type='hidden'>").val(chalid));
        options.append(add_discovery);

        if($.inArray(chalid, discoveryList) > -1){
            add_discovery.click();
        }
    });


    if(options.children().length == 0){
      options.append('<li>&nbsp; No files uploaded</li>');
    }

    buttons.append('<a href="#" onclick="$(this).parent().parent().remove(); setSubmitDiscBtnStatus()" style="margin-right:-10px;" class="btn btn-danger pull-right discovery-remove-button">Remove</a>');
    elem.append(buttons);
    return elem;
    
}


$('#create-key').click(function(e){
    var amt = $('#current-keys input[type=text]').length

    var elem = $('<div class="col-md-4">');

    elem.append($("<div class='form-group'>").append($("<input class='current-key form-control' type='text'>")));
    elem.append('<div class="radio-inline"><input type="radio" name="key_type['+amt+']" value="0" checked>Static</div>');
    elem.append('<div class="radio-inline"><input type="radio" name="key_type['+amt+']" value="1">Regex</div>');
    elem.append('<a href="#" onclick="$(this).parent().remove()" class="btn btn-danger key-remove-button">Remove</a>');

    $('#current-keys').append(elem);
});

$(function(){
    loadchals();
})
