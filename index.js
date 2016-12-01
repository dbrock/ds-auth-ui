onhashchange = () => location.reload()

if (!location.hash) {
  location.hash = "0x0000000000000000000000000000000000000000"
}

var names = {
  "0x7bb0b08587b8a6b8945e09f1baca426558b0f06a": "Alpha Dynasty",
  "0xd3a84329b273d5b63002cf390a736c2f204b1aeb": "DAI frontend",
  "0xc66ea802717bfb9833400264dd12c2bceaa34a6d": "MKR frontend",
  "0x77a79a78c56504c6c1f7499852b6e1918a6d0ab4": "MakerDAO root",
}

var sigs = [
  "moveBalance(address,address,uint256)",
  "setApproval(address,address,uint256)",
  "emitTransfer(address,address,uint256)",
  "emitApproval(address,address,uint256)",
  "transfer(address,address,uint256)",
  "transferFrom(address,address,address,uint256)",
  "approve(address,address,uint256)",
]

function describeSig(sighash) {
  return sigs.filter(
    sig => toBytes4(keccak(sig)) == toBytes4(sighash)
  )[0] || toBytes4(sighash)
}

Promise.resolve(location.hash.slice(1)).then(root => {
  root = hex(root)

  document.write(`
    <div style="margin: 1rem; overflow: hidden">
      <div style="float: left; margin-right: 2rem">
        <b style="color: gray">DSBasicAuthority</b>
      </div>
      <div style="float: left">
        <b>${root}</b>
        <div>${names[root] || ""}</div>
      </div>
    </div>
    <div data-field=${root}-graph style="margin: 2rem 1rem">...</div>
    <div data-field=${root}-table style="margin: 1rem"></div>
  `)

  function describe(address) {
    return names[toAddress(address)] ||
      toAddress(address).slice(0, 10)
  }

  eth_call(root, "_authority()(address)").then(authority => {
    etherscan_getLogs(root).then(logs => {
      rpc("eth_getBlockByNumber", {
        tag: logs[0].blockNumber,
        boolean: true,
      }).then(block0 => {
        rpc("eth_getBlockByNumber", {
          tag: logs[logs.length - 1].blockNumber,
          boolean: true,
        }).then(block1 => {
          function getBlockTime(number) {
            return (Number(block0.timestamp) + (
              (Number(number) - block0.number) * (
                Number(block1.timestamp) - Number(block0.timestamp)
              ) / (
                Number(block1.number) - Number(block0.number)
              )
            )) * 1000
          }

          var edges = logs.filter(log => {
            return log.topics[0] == keccak(
              "DSSetCanCall(address,address,bytes4,bool)"
            )
          }).reduce((result, log) => {
            var words   = toWords(log.data)
            var from    = hex(words[0])
            var to      = hex(words[1])
            var sig     = hex(words[2])
            var canCall = !!Number(words[3])
            var key     = `${from} ${to} ${sig}`
    
            if (canCall) {
              result[key] = log.blockNumber
            } else {
              delete result[key]
            }
    
            return result
          }, {})
    
          edges = Object.keys(edges).map(key => {
            return [edges[key], ...key.split(" ")]
          }).reverse()
    
          update({
            [`${root}-table`]: `
              <table>
                <tr>
                  <th>Granted</th>
                  <th>Sender</th>
                  <th><span style="visibility: hidden">&rarr;</span> Receiver</th>
                  <th>Message</th>
                </tr>
                ${edges.map(([block, from, to, sig]) => `
                  <tr>
                    <td>${new Date(getBlockTime(Number(block))).toISOString().replace(/\..*/, "")}</td>
                    <td>${describe(from)}</td>
                    <td>&rarr; ${describe(to)}</td>
                    <td>${describeSig(sig)}</td>
                  </tr>
                `).join("\n")}
              </table>
            `,
            [`${root}-graph`]: Viz(`
              digraph {
                graph [fontname = "monospace"];
                node [fontname = "monospace"];
                edge [fontname = "monospace"];
                fontname="monospace";
                " ${describe(root)} " -> " ${describe(authority)} "
                [label="      owned by      ", style=bold, arrowhead=odot]
                ${edges.map(([block, from, to, sig]) => `
                  " ${describe(from)} " -> " ${describe(to)} "
                  [label="       ${describeSig(sig).replace(/\(.*/, "")}       "]
                  [style=dashed, arrowhead=open]
                `).join("\n")}
              }
            `)
          })
        })
      })
    })
  })
}).catch(alert)
