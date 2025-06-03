const { chromium } = require("playwright")
const fs = require("fs")

type User = {
    FirstName: string;
    LastName: string;
    Email: string;
    UserID: string;
}

async function fetchCurrentUser(page): Promise<User>{
    await page.goto("https://challenge.sunvoy.com/settings")
    await page.waitForSelector("form")
    const attributes = await page.locator("form input").all()
    const user: User = {
        FirstName: await attributes.at(1).getAttribute("value"),
        LastName: await attributes.at(2).getAttribute("value"),
        Email: await attributes.at(3).getAttribute("value"),
        UserID: await attributes.at(0).getAttribute("value"),
    }
    return user
}

async function fetchUsers(page): Promise<User[]>{
    await page.waitForSelector("#userList > div")
    const userList = await page.locator("#userList > div").all()
    
    const users: User[] = []
    for(const user of userList){
        const fullName = (await user.locator("h3").textContent()).split(" ")
        const userObj: User = {
            FirstName : fullName[0],
            LastName : fullName[1],
            Email : await user.locator("p").first().textContent(),
            UserID : (await user.locator("p").last().textContent()).replace("ID: ", "")
        }
        users.push(userObj)
    }
    return users
}

async function UserLogin(page): Promise<void> {
    await page.goto("https://challenge.sunvoy.com")

    await page.locator("input[name=username]").fill("demo@example.org")
    await page.locator("input[name=password]").fill("test")
    await page.locator("button[type=submit]").click()
}

async function main(){
    const browser = await chromium.launch({headless: true})
    const page = await browser.newPage()
    await UserLogin(page)
    const users: User[] = [...(await fetchUsers(page)), await fetchCurrentUser(page)]
    fs.writeFile("users.json", JSON.stringify(users), ()=>{})
    browser.close()
}

main()