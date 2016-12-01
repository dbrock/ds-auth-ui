function toQueryString(params) {
  return Object.keys(params).map(name => ([
    encodeURIComponent(name),
    encodeURIComponent(params[name]),
  ])).map(([name, value]) => `${name}=${value}`).join("&")
}

var useCache = false
var etherscan = params => Promise.resolve(
  `https://api.etherscan.io/api?${toQueryString(params)}`
).then(url => {
  if (useCache && localStorage.getItem(url)) {
    return JSON.parse(localStorage.getItem(url))
  } else {
    return fetch(url).then(response => {
      if (response.ok) {
        return response.json().then(object => {
          localStorage.setItem(url, JSON.stringify(object))
          return object
        })
      } else {
        throw new Error(`HTTP ${response.statusCode}`)
      }
    }).catch(error => {
      throw new Error(`${url}: ${error.message}`)
    })
  }
}).then(json => {
  if (json.error) {
    throw new Error(JSON.stringify(json.error))
  } else {
    return json.result
  }
})

function rpc(action, params={}) {
  return etherscan(Object.assign({ module: "proxy", action }, params))
}

function hex(string) {
  return `0x${unhex(string)}`
}

function uniq(xs) {
  return Object.keys(xs.reduce((a, x) => (a[x] = true, a), {}))
}

function unhex(string) {
  return string.replace(/^0x/i, "")
}

function toWords(string) {
  return unhex(string).match(/.{1,64}/g).map(hex)
}

function toBytes4(string) {
  return hex(unhex(string).slice(0, 8))
}

function keccak(string) {
  return hex(keccak_256(string))
}

function toAddress(string) {
  return hex(unhex(string).slice(unhex(string).length - 40))
}

var T = {
  address: toAddress,
}

function eth_call(address, data, block="latest") {
  var match = data.match(/^((\w+)\(([\w,]*)\))(?:\(([\w,]*)\))?$/)
  return rpc("eth_call", {
    to   : hex(address),
    data : /\(/.test(data) ? toBytes4(keccak(match[1])) : hex(data),
    tag  : block,
  }).then(result => {
    return match ? T[match[4]](result) : result
  })
}

function etherscan_getLogs(address, fromBlock=0, toBlock="latest") {
  return etherscan({
    module: "logs", action: "getLogs",
    fromBlock, toBlock, address,
  })
}

function txlist(address, startblock=0, endblock=99999999) {
  return etherscan({
    module: "account", action: "txlist",
    startblock, endblock, address,
  })
}

function assert(value) {
  if (value) {
    return value
  } else {
    throw new Error
  }
}

function update(fields) {
  Object.keys(fields).forEach(name => {
    var elements = document.querySelectorAll(`[data-field='${name}']`)
    for (var element of elements) {
      element.innerHTML = fields[name]
    }
  })
}
