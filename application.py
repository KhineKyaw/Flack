import os,datetime

from flask import Flask, session, jsonify, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)


ChatRooms = {
            "Python Programming": [{"user_name": "Chat Bot", "date_time": "SUN 9:23AM", "data_msg": "Welcome Text! Hello this is Python Programming Channel!"},
            {"user_name": "Chat Bot", "date_time": "SUN 9:23AM", "data_msg": "Python Programming Channel!"},
            {"user_name": "Chat Bot", "date_time": "SUN 9:23AM", "data_msg": "Welcome Text!"}],
            "Machine Learning": [{"user_name": "Chat Bot", "date_time": "TUE 11:20AM", "data_msg": "Hello this is Machine Learning Channel!"}],
            "University (6BE_EC)": [{"user_name": "Chat Bot", "date_time": "MON 1:45PM", "data_msg": "University Group"}]
            }
UserChatRoom = dict()

@app.route("/", methods=["GET", "POST"])
def index():
    global UserChatRoom
    if request.method == "POST":
        session["user_name"] = request.form.get("name")
        UserChatRoom[session["user_name"]] = list(ChatRooms.keys())[0]
        return render_template("index.html", user_name=session["user_name"],
                active_chatroom=UserChatRoom[session["user_name"]], chat_rooms = ChatRooms.keys())
    else:
        return render_template("index.html", user_name=session.get("user_name"),
               active_chatroom=UserChatRoom.get(session.get("user_name")), chat_rooms = ChatRooms.keys())

@app.route("/<string:channel_name>", methods=["GET"])
def channel_linker(channel_name):
    if channel_name.replace('-', ' ') in ChatRooms.keys():
        return render_template("index.html", user_name=session.get("user_name"),
                active_chatroom=channel_name, chat_rooms = ChatRooms.keys())
    else:
        return render_template("error.html")

@socketio.on("send message")
def sends(data):
    global UserChatRoom
    if data.get("void"):
        UserChatRoom[session.get("user_name")] = data["chat_room"]
        emit("message all", {"msg": ChatRooms[data["chat_room"]], "room": data["chat_room"]}, broadcast=False)
    else:
        date = datetime.datetime.now().strftime('%A %X%p')
        date = date[:-5] + date[-2:]
        data["date_time"] = date
        ChatRooms[data["chat_room"]].append(data)

        # Check message with same datetime.
        if ChatRooms[data["chat_room"]][-1]["date_time"] == ChatRooms[data["chat_room"]][-2]["date_time"]:
            temp = data.copy()
            temp["date_time"] = ""
        else:
            temp = data.copy()
        emit("message all", {"msg": [temp,], "room": data["chat_room"]}, broadcast=True)

@socketio.on("add channel")
def addchannel(data):

    # Channel Already Exist.
    if data["channel"] in ChatRooms.keys():
        msg = "You can't add the channel. Which is already exist!"
        emit("display channel", {"channel_name": False, "message": msg}, broadcast=False)
    elif not(len(data["channel"].replace(' ', ''))) or ('-' in data["channel"]):
        msg = "Channel name must not contain '-' or 'empty string'!"
        emit("display channel", {"channel_name": False, "message": msg}, broadcast=False)
    else:
        ChatRooms[data["channel"]] = list()
        emit("display channel", {"channel_name": data["channel"]}, broadcast=True)


if __name__ == "__main__":
    app.run()
