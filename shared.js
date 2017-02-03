/*jshint esversion:6 */
var debug_mode = false;
var log_count = 0;
function log(t) {
  try {
    sd = document.getElementById('statusdiv');
    sd.innerText += '(' + log_count + '): ' + t + "\n";
    sd.scrollTop = sd.scrollHeight;
    log_count += 1;
  } catch (e) { }
  if (debug_mode) {
    console.log(t);
  }
}

// sets the initial stored url for configuration fetching
// if it is not already set. It also stores it to the local store.
function set_initial_url(cb) {
  var source = null;
  chrome.storage.local.get(['config_source'],function(items) {
    if (items.hasOwnProperty('config_source')) {
      source = items.config_source;
      cb(source);
    } else {
      log('resetting config_source at set_initial_url');
      source = defaults.config_source;
      chrome.storage.local.set({'config_source': source},function() {
        cb(source);
      });
    }
  });
}


// send a message to an event page to have it do an xhr for us
function loadConfigRemote(cb) {
  chrome.storage.local.get(['config_source'],function(items) {
    if (items.hasOwnProperty('config_source')) {
      chrome.runtime.sendMessage(
        null,
        {'cmd':'get',
        'url': items.config_source},
        null,
        function(resp) {
          if ((resp === null) || (resp.err === null)) {
            if (false) {
              log('resetting config_source at set_initial_url');
              source = defaults.config_source;
              chrome.storage.local.set({'config_source': source},function() {
                cb('err','error in eventpage code');
              });
            } else {
              cb('err','error in eventpage code');
            }
          } else if (resp.err == 'OK') {
            storeConfig(null,resp.text,cb);
          } else {
            cb('err',resp.status);
          }
       });
    } else {
      cb('err','no config source');
    }
  });
}


function loadConfig(cb,try_remote = true) {
  log('loadConfig START');
  chrome.storage.local.get(
    ['cfgdata', 'config_date', 'config_valid', 'config_source'],
    function(items) {
      log('loadConfig readLocal');
      var now = (new Date()).getTime();
      var have_config = items.hasOwnProperty('config_valid') && items.config_valid;
      var max_age = defaults.max_age;
      if (have_config) {
        if (items.cfgdata.hasOwnProperty('refresh_age')) {
          max_age = items.cfgdata.refresh_age;
        }
      }
      var force_local = (have_config &&
                        items.hasOwnProperty('config_source') &&
                        (items.config_source == '__local__')) ;
      // if max_age is set to negative then we never refresh
      var use_local = force_local ? true :
                     max_age < 0 ? true :
        ((now - items.config_date) < max_age);

      if (have_config && use_local) {
        log('loading from local storage');
        cb(null,items.cfgdata);
      } else if (try_remote) {
        log('calling loadConfigRemote');
        loadConfigRemote(cb);
      } else {
        log('loadConfig FAILED');
        cb('load_config_failed');
      }
    });
    log('loadConfig DONE');
}


function storeConfig(err,txt,cb) {
  log("storeConfig START");
  if (err !== null) {
    cb(err,txt);
    return;
  }

  var data = {};

  try {
    data = JSON.parse(txt);
  } catch(e) {
    log("JSON parse error");
    log(e);
    cb(e,txt);
    return;
  }

  if (data.schema.match(/InsultMarkupLanguage\/0.\d/)) {
    chrome.storage.local.set({'cfgdata': data}, function() {
      if (chrome.lastError) {
        cb(chrome.lastError);
      } else {
        date = (new Date()).getTime();
        chrome.storage.local.set({'config_date': date}, function() {});
        chrome.storage.local.set({'config_valid': true}, function() {});
        chrome.storage.local.set({'last_chosen_time': 0}, function() {});
        log("STORE SUCCESS");
        loadConfig(cb,false);
      }
    });
  }
}

function createAndSetStyle(name,style_text) {
    var style_element_id = 'detrumpify_style_element';
    var se = document.getElementById(style_element_id);
    if (se === null) {
      se = document.createElement('style');
      se.setAttribute('id',style_element_id);
      se.type = 'text/css';
      document.getElementsByTagName('head')[0].appendChild(se);
    }
    se.textContent = name + ' { ' + style_text + ' } ';
}

function removeChildrenReplaceWith(elem,newchildren) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
    for (var i=0;i<newchildren.length;i++) {
        elem.appendChild(newchildren[i]);
    }
}
