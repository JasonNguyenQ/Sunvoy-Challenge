/*Attempt 1 With No Libraries*/

async function readStream(stream){
    const html = []
    for await (const chunk of stream) {
        for (const n of chunk) {
            html.push(String.fromCharCode(n))
        }
    }

    return html.join("")
}

fetch('https://challenge.sunvoy.com/login').then(async (response)=>{
    const html = await readStream(response.body)
    const pattern = "<input type=\"hidden\" name=\"nonce\" value=\""
    const start = html.indexOf(pattern)+pattern.length
    const value = html.slice(start,html.indexOf("\"", start))
    Login(value)
})

function Login(value){
    fetch('https://challenge.sunvoy.com/login', {
        method: "POST",
        headers: {
            "Accept": "text/html",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({nonce: value, username: "demo@example.org", password: "test"}),
        redirect: "manual"
    }).then(async (response)=>{
        const cookies = response.headers.getSetCookie()
        console.log(await getUsers(cookies))
        await getCurrentUser(cookies)
    })
}

async function getUsers(cookies){
    const response = await fetch('https://challenge.sunvoy.com/api/users', {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Cookie": cookies
        },
    })
    const users = await response.json()
    return users
}

function getInputValues(html){
    const m = {}
    const patternID = "<input type=\"hidden\" id=\""
    const patternValue = "value=\""
    let s = 0
    while(true){
        const startID = html.indexOf(patternID, s)+patternID.length
        const id = html.slice(startID,html.indexOf("\"", startID))

        const startValue = html.indexOf(patternValue, s)+patternValue.length
        const value = html.slice(startValue,html.indexOf("\"", startValue))

        if(startValue <= startID) break
        m[id] = value
        s = startValue
    }
    return m
}

async function getCurrentUser(cookies){
    const tokens = await fetch("https://challenge.sunvoy.com/settings/tokens",{
        method: "GET",
        headers: {
            "Cookie": cookies
        }
    });
    const inputs = getInputValues(await readStream(tokens.body))
}