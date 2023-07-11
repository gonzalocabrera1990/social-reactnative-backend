var User = require("../models/users");

const helpers = {}
helpers.changeSort = async (emisor, receptor, id) => {

  console.log('res', emisor)
  console.log('res', receptor)
  User.findById(receptor)
    .then(u => {
      let indexOne = u.inboxFollows.findIndex(f => f.id == emisor)
      console.log('indexOne', indexOne)

      let resultOne = u.inboxFollows.filter(f => f.id == emisor)[0]
      if(!resultOne.inboxId) resultOne.inboxId = id
      if (indexOne !== 0) {
        u.inboxFollows.splice(indexOne, 1)
        u.inboxFollows.unshift(resultOne)
      }
      
      u.save(() => {
        User.findById(emisor)
          .then(us => {
            let indexTwo = us.inboxFollows.findIndex(f => f.id == receptor)
            console.log('indexTwo', indexTwo)
            
            let resultTwo = us.inboxFollows.filter(f => f.id == receptor)[0]
            if(!resultTwo.inboxId) resultTwo.inboxId = id
            if (indexTwo !== 0) {
              us.inboxFollows.splice(indexTwo, 1)
              us.inboxFollows.unshift(resultTwo)
            }
            us.save((err, user) => {
              return user.inboxFollows
            })
          })
      })
    })
    .catch(error => console.error(error))
}
helpers.addInboxId = async (emisor, receptor, id) => {
  User.findById(receptor)
    .then(u => {
      u.inboxFollows.find(f => f.id == emisor).inboxId = id
      u.save()
      .then(item =>{
        return item
      })
        // .then(() => {
        //   User.findById(emisor)
        //     .then(us => {
        //       us.inboxFollows.find(f => f.id == receptor).finboxId = inboxId
        //       us.save((err, item)=>{
        //         return item
        //       })
        //     })
        // })
    })
    .catch(error => console.error(error))
}
helpers.testUsers = async (param) => {
  let username = param;
  let result = await User.findOne({ usuario: username })
  if (!result) {
    return new Promise((resolve, reject) => {
      resolve(username)
    })
  } else {
    let change = username.split('').slice(-1);
    return helpers.testUsers(`${username}${change}`)
  }
}

helpers.getUsuario = async (test) => {
  let userTest = test.split('@')[0];
  let result = await helpers.testUsers(userTest);
  return new Promise((resolve, reject) => {
    resolve(result)
  })
}

helpers.randomNumber = (len) => {
  const possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  let setRandomNumber = 0;
  for (let i = 0; i < len; i++) {
    setRandomNumber += possible.charAt(
      Math.floor(Math.random() * possible.length)
    );
  }
  return setRandomNumber;
};

helpers.measure = (timestamp) => {
  let begin = new Date(timestamp).getTime();
  let now = Date.now();
  let time = now - begin;
  const hours = (Math.floor((time) / 1000)) / 3600;
  return hours;
}

helpers.scopeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
module.exports = helpers;