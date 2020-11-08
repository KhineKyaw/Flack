document.addEventListener('DOMContentLoaded', () => {
    // FrontEnd
    function ShowHideSidebar(sidebar, background, show) {
      if (show) {
        sidebar.style.display = "block";
        background.style.display = "block";
      }
      else {
        sidebar.style.display = "none";
        background.style.display = "none";
      }
    }

    document.querySelector('.sidebutton').onclick = () => {
      const sidebarbody = document.querySelector('.sidebarbody');
      const bodyback = document.querySelector('.bodybackground');
      if (sidebarbody.style.display == "block") {
        ShowHideSidebar(sidebarbody, bodyback, false);
        document.querySelector('.main').style.filter = "";
      }
      else {
        ShowHideSidebar(sidebarbody, bodyback, true);
        document.querySelector('.main').style.filter = "blur(2px)";
      }

      function ShowButton() {
        if (window.innerWidth > 768) {
          ShowHideSidebar(sidebarbody, bodyback, true);
          document.querySelector('.main').style.filter = "";
        }
        else if (window.innerWidth <= 768) {
          ShowHideSidebar(sidebarbody, bodyback, false);
        }
      }
      window.addEventListener('resize', ShowButton);
    };

    // Backend

    const user_name = document.querySelector('#userName').textContent;

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    var loaded = false;
    active_chatroom = document.querySelector('#active_chat').dataset.page;
    if (!active_chatroom) {
      var active_chatroom = document.querySelector('.list-group-item').dataset.page;
    }

    // When connected, configure buttons
    socket.on('connect', () => {
        // Load the message history
        if (!loaded) {
            loaded = true;
            load_channel(document.querySelector("[data-page='" + active_chatroom + "']"), true);
          }

        document.querySelector('#submit-form').onsubmit = () => {
            var data_msg = document.querySelector('.inputfield').value;
            socket.emit('send message', {'user_name': user_name, 'data_msg': data_msg, 'chat_room': active_chatroom});

            document.querySelector('.inputfield').value = '';
            document.querySelector('.submitbutton').disabled = true;

            // Stop form from submitting
            return false;
        };
    });

    // Channel Selector

    function channelSelector() {
        document.querySelectorAll('.list-group-item').forEach(link => {
            link.onclick = () => {
              load_channel(link);
              return false;
            };
        });
      };

    // Update text on popping state.
    window.onpopstate = e => {
        const data = e.state;
        if (data) {
            document.title = data.title;
            active_chatroom = data.title;
            channel_loader(document.querySelector("[data-page='" + data.title + "']"), data.title);
        }
        else {
            document.title = active_chatroom;
            channel_loader(document.querySelector("[data-page='" + active_chatroom + "']"), active_chatroom);
        }
    };

    function load_channel(link, replace=false) {
        active_chatroom = link.dataset.page;
        channel_loader(link, active_chatroom);

        // PUsh state to URL.
        document.title = active_chatroom;
        var link_name = active_chatroom.replace(/\s/g, '-');
        if (replace) {
          history.replaceState({'title': active_chatroom}, active_chatroom, link_name);
        }
        else {
          history.pushState({'title': active_chatroom}, active_chatroom, link_name);
        }
    };

    // Helper function to load channel list.
    const channel_head = Handlebars.compile(document.querySelector('#channel_header').innerHTML);
    function channel_loader(link, chatroom) {
        document.querySelectorAll('.list-group-item').forEach(link => {
            link.style.color = "#fafafa";
        });
        link.style.color = "#ffb14c";

        var main = document.querySelector(".main");
        while (main.hasChildNodes()) {
            main.removeChild(main.firstChild);
        }

        var head = channel_head({'contents': chatroom});
        document.querySelector('.main').innerHTML += head;
        socket.emit('send message', {'void': true, 'chat_room': chatroom});
    };

    channelSelector();


    // Add Channel links
    document.querySelector('.AddChannel').onclick = () => {
        document.querySelector('.AddChannel').style.display = "none";
        document.querySelector('.channel-box').style.display = "block";
        document.querySelector('.channel-box').focus();
        return false;
    };

    document.querySelector('#add-chn-submit').onsubmit = () => {
        var channel = document.querySelector('.channel-box').value;
        socket.emit('add channel', {"channel": channel});
        document.querySelector('.channel-box').value = "";
        document.querySelector('.channel-box').style.display = "none";
        document.querySelector('.AddChannel').style.display = "inline";
        return false;
    };

    document.querySelector('.submitbutton').disabled = true;

    document.querySelector('.inputfield').onkeyup = () => {
      text_value = document.querySelector('.inputfield').value;
      if (text_value.length > 0 && text_value.replace(/\s/g, '').length)
          document.querySelector('.submitbutton').disabled = false;
      else
          document.querySelector('.submitbutton').disabled = true;
    };

    // scroll
    function ScrollMain() {
      window.scrollTo(0, document.querySelector('.main').offsetHeight);
    }

    new ResizeObserver(ScrollMain).observe(document.querySelector('.main'));

    const message_template = Handlebars.compile(document.querySelector('#message').innerHTML);
    const message_template_my = Handlebars.compile(document.querySelector('#message_my').innerHTML);
    const image_msg = Handlebars.compile(document.querySelector('#image_msg').innerHTML);
    const image_msg_my = Handlebars.compile(document.querySelector('#image_msg_my').innerHTML);
    function add_message(data) {
        // Create new post.
        if (user_name === data.user_name) {
            if (data.type) {
              var message = image_msg_my({'contents': data.binary, 'date_time': data.date_time})
            }
            else {
              var message = message_template_my({'contents': data.data_msg, 'date_time': data.date_time});
            }
        }
        else {
            if (data.type) {
              var message = image_msg({'user_name': data.user_name, 'date_time': data.date_time, 'contents': data.binary})
            }
            else {
              var message = message_template({'user_name': data.user_name, 'date_time': data.date_time, 'contents': data.data_msg});
            }
        };

        // Add post to DOM.
        document.querySelector('.main').innerHTML += message;
    }

    socket.on('message all', data => {
      if (data["room"] === active_chatroom ) {
          // data["msg"].forEach(add_message)
          for (i = 0, len = data["msg"].length; i < len; i++) {
              const temp = Object.assign({}, data["msg"][i]);
              if (i && (data["msg"][i].date_time === data["msg"][i - 1].date_time)) {
                temp.date_time = "";
              }
            add_message(temp);
          }
        }
    });

    const new_channel_template = Handlebars.compile(document.querySelector('#new_channel').innerHTML);
    socket.on('display channel', data => {
        if (data.channel_name) {
            var new_chan = new_channel_template({'contents': data.channel_name});

            // Add channel to DOM.
            document.querySelector('.list-group').innerHTML += new_chan;
            // Update Channel selector.
            channelSelector();
            // Select Created channel.
            load_channel(document.querySelector("[data-page='" + data.channel_name + "']"));
        }
        else {
            alert(data.message);
        }
    });

    document.getElementById('imgs').addEventListener('change', handleFileSelect, false);

    // Send and Handle Image Functions.

    function handleFileSelect(ele) {
      var file = ele.target.files[0];
      var fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
          var arrayBuffer = fileReader.result;
          socket.emit("send message", {
            'user_name': user_name,
            'file_name': file.name,
            'type': file.type,
            'size': file.size,
            'binary': arrayBuffer,
            'chat_room': active_chatroom
          });
      }
    }

});
