'use strict'

const test = require('tape')
const fetch = require('..')

test(t => {
  t.plan(3)
  // start one
  fetch('http://www.w3.org/People/Sandro')
    .then(res => {
      return res.text()
    }).then( text => {
      //console.log(text)
      t.assert(text.indexOf('Sandro') > 0)
      fetch('http://www.w3.org/People/Sandro')
        .then(res => {
          return res.text()
        }).then( text => {
          //console.log(text)
          t.assert(text.indexOf('Sandro') > 0)
        })
        .catch(err => {
          console.log('ERR', err)
          throw err
        })
    })
    .catch(err => {
      console.log('ERR', err)
      throw err
    })

  // immediately start another, which should be forced
  // to sleep    
  fetch('http://www.w3.org/People/Sandro')
    .then(res => {
      return res.text()
    }).then( text => {
      //console.log(text)
      t.assert(text.indexOf('Sandro') > 0)
    })
    .catch(err => {
      console.log('ERR', err)
      throw err
    })

})


