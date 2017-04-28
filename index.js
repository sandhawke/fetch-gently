'use strict'
/*
  Drop-in replacement (wrapper) for node-fetch that sleeps before
  doing the fetch if it's going too fast for remote host.

  It doesn't actually sleep long enough when you do a bunch at once.

  We need, like a general setTimeout and a queue, or something.

*/
const fetch = require('node-fetch')
const debug = require('debug')('fetch-gently')
const urlmodule = require('url')

// mapping host -> milliseconds
const sleep = {}

function fetchGently (url, opts) {
  const host = urlmodule.parse(url).host

  return new Promise( (resolve, reject) => {
    tryit(0)
    
    function tryit (retries) {

      const delay = sleep[host]
      debug('need to sleep for', delay, 'ms')
      if (delay) {
        setTimeout(next, delay)
      } else {
        if (delay !== 0) sleep[host] = fetchGently.default
        next()
      }

      function next () {
        debug('invoking underlying fetch', url)
        fetch(url, opts)
          .then(res => {
            debug('fetch called .then')
            adjustSleep(res)
            resolve(res)
          })
          .catch(err => {
            if (err.status === 429 || err.status === 500 || err.status === 502) {
              debug('error', err.status)
              const oldsleep = sleep[host]
              const newsleep = (oldsleep+1000) * 4
              debug('exponential backoff, sleep adjusted', oldsleep, '->', newsleep)
              sleep[host] = newsleep
              retries++
              if (retries < fetchGently.retries) {
                debug('starting retry #', retries)
                tryit(retries)
              } else {
                reject(err)
              }
            } else {
              reject(err)
            }
          })
            }
    }
  })

  function adjustSleep (res) {
    let reset = res.headers.get('x-ratelimit-reset')
    let remaining = res.headers.get('x-ratelimit-remaining')
    try {
      reset = Date.parse(reset)
    } catch (e) {
      debug('cant parse date for ratelimit reset', reset)
      reset = undefined
    }
    try {
      remaining = parseInt(remaining)
    } catch (e) {
      debug('cant parse remaining for ratelimit ', remaining)
      remaining = undefined
    }
    if (reset && (remaining || remaining === 0)) {
      const now = Date.now()
      if (remaining < 1) remaining = 1
      debug('count remaining', remaining)
      debug('reset in', reset - now)
      sleep[host] = fetchGently.utilization * (reset - now) / remaining
      debug('sleep', sleep[host])
    } else {
      debug('no ratelimit parameters, so decrease sleep by 0.2s')
      sleep[host] -= 200
    }
  }
}

fetchGently.default = 2000
fetchGently.utilization = 0.80  
fetchGently.retries = 5

module.exports = fetchGently  
