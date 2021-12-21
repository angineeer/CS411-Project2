# Welcome to Hoot Instant Messaging!
Hoot is a web based instant messaging application that is made using mainly Node.js, Express and JQuery.\
Complex project structure avoided as much as possible for the sake of simplicity. So:
- App.js contains all the backend code while index.html contains all the frontend code.
- Package files are for npm package installation 
- Procfile is a config file for hosting project on heroku.
- Static files such as icons, scripts, styles are served from the **static** directory.
## Installation and Running
> Applicaton can be used directly and is currently hosted on https://hoot-message.herokuapp.com/
#### Steps:
- To run the app Node.js must be installed first. LTS version can be downloaded using the link: https://nodejs.org/en/download/
- Clone project to a local directory. Open a terminal then change directory to the cloned project directory. Run **npm install** command in the terminal in order to install required dependencies.
- In order to run the application, run **node app.js** command in terminal (Make sure that you are still in the directory containing app.js)
- Open the indicated url (http://localhost:3000) in a browser
## Application Usage
- Type a username and password in the opened modal. (If username exists you will be logged in, else new account will be created)
- Open site in another tab for another user. Type another username and password in the opened modal.
- Add the other user using the username and input box on the top left. (Other user will be automatically notified when added as friend)
- Select the added user from the left on each account. (After that you will be joined to the chat room with selected user)
- Send a message using the input box on the bottom. (Other user will automatically receive the sent message without need for a page refresh)
