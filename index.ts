const crypt = require("crypto")
const fs = require("fs")

type Tokens = {
    access_token: string;
    apiuser: string;
    language: string;
    openId: string;
    operateId: string;
    userId: string;
}

type SignedRequest = Tokens & {
    payload: string;
    fullPayload: string;
    timestamp: number;
    checkcode: string;
}

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

async function readStream(stream){
    const html : String[] = []
    for await (const chunk of stream) {
        for (const n of chunk) {
            html.push(String.fromCharCode(n))
        }
    }

    return html.join("")
}

async function getNonce() : Promise<string>{
    const response : Response = await fetch('https://challenge.sunvoy.com/login')
    const html : string = await readStream(response.body)
    const pattern : string = "<input type=\"hidden\" name=\"nonce\" value=\""
    const start : number = html.indexOf(pattern)+pattern.length
    const value : string = html.slice(start,html.indexOf("\"", start))
    return value
} 

async function Login(value : string) : Promise<string[]> {
    const response : Response = await fetch('https://challenge.sunvoy.com/login', {
        method: "POST",
        headers: {
            "Accept": "text/html",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({nonce: value, username: "demo@example.org", password: "test"}),
        redirect: "manual"
    })

    return response.headers.getSetCookie()
}

async function getUsers(cookies: string[]) : Promise<User[]>{
    const response : Response = await fetch('https://challenge.sunvoy.com/api/users', {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Cookie": cookies.join(";")
        },
    })
    const users = await response.json()
    return users
}

function getInputValues(html) : Tokens{
    const m = {}
    const patternID : string = "<input type=\"hidden\" id=\""
    const patternValue : string = "value=\""
    let s : number = 0
    while(true){
        const startID : number = html.indexOf(patternID, s)+patternID.length
        const id : string = html.slice(startID,html.indexOf("\"", startID))

        const startValue : number = html.indexOf(patternValue, s)+patternValue.length
        const value : string = html.slice(startValue,html.indexOf("\"", startValue))

        if(startValue <= startID) break
        m[id] = value
        s = startValue
    }
    return m as Tokens
}

async function getTokens(cookies: string[]) : Promise<Tokens> {
    const response : Response = await fetch("https://challenge.sunvoy.com/settings/tokens",{
        method: "GET",
        headers: {
            "Cookie": cookies.join(";")
        }
    })
    return getInputValues(await readStream(response.body))
}

function createSignedRequest(obj : Tokens) : SignedRequest {
    const hash = crypt.createHmac("sha1", "mys3cr3t")
    const timestamp : number = Math.floor(Date.now() / 1e3)
    const newObj = {...obj, timestamp: timestamp.toString()}
    const payload : string = Object.keys(newObj).sort().map(t => `${t}=${encodeURIComponent(obj[t])}`).join("&")
    hash.update(payload)
    const checkcode = hash.digest("hex").toUpperCase()
    const fullPayload : string = `${payload}&checkcode=${checkcode}`
    return {payload, checkcode, timestamp, fullPayload} as SignedRequest
}

async function getCurrentUser(cookies : string[]) : Promise<User>{
    const tokens : Tokens = await getTokens(cookies)
    const signedRequest : SignedRequest = createSignedRequest(tokens)
    const response : Response = await fetch("https://api.challenge.sunvoy.com/api/settings",{
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: signedRequest.fullPayload
    });
    return await response.json()
}

async function main(){
    const nonce : string = await getNonce()
    const cookies : string[] = await Login(nonce)
    const users : User[] = await getUsers(cookies)
    const currentUser : User = await getCurrentUser(cookies)
    const combinedUsers : User[] = [...users, currentUser]
    fs.writeFile("users.json", JSON.stringify(combinedUsers), ()=>{})
}

main()