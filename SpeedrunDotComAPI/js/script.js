
let gameID;
let resultGames = document.getElementById("resultAllGames");
let time;
let wrVideo;
let select = document.getElementById("categorySelect");
let varDiv;

async function searchGame()
{
    resultGames.innerHTML = "";

    let userGame = document.getElementById("gameSearch").value.toLowerCase();

    const gameAPI = await fetch(`https://www.speedrun.com/api/v1/games?name=${userGame}`)

    const gameData = await gameAPI.json();


    for (let i = 0; i < gameData.data.length; i++)
    {
        if (gameData.data[i].names.international.toLowerCase().includes(userGame.toLowerCase()))
        {
            let gameName = document.createElement("label");
            gameName.textContent = gameData.data[i].names.international;
            gameName.name = gameData.data[i].names.international;
            gameName.id = gameData.data[i].id;
            gameName.style.margin = 5 + "px";
            gameName.style.padding = 5 + "px";
            gameName.className = "marhey-text"
            gameName.dataset.game = JSON.stringify(gameData.data[i]);
            gameName.onclick = clickGame;
            resultGames.append(gameName);

        }
    }

    
}

async function clickGame()
{
    let currGame = JSON.parse(this.dataset.game);

    select.innerHTML = "";

    document.querySelectorAll('[id$="-variables"]').forEach(div => div.remove());


    gameID = currGame.id;

    const categoryAPI = await fetch(`https://www.speedrun.com/api/v1/games/${gameID}/categories`);

    const categoryData = await categoryAPI.json();

    for (let category of categoryData.data)
    {
        if (category.type == "per-game")
        {
            let option = document.createElement("option");
            option.value = category.id;
            option.text = category.name;
            select.appendChild(option);

            varDiv = document.createElement("div");
            varDiv.id = `${category.id}-variables`;
            varDiv.style.display = "none";
            document.getElementById("subCategories").appendChild(varDiv);

            
            const variablesAPI = await fetch(`https://www.speedrun.com/api/v1/categories/${category.id}/variables`);
            const variablesData = await variablesAPI.json();

            for (let i = 0; i < variablesData.data.length; i++)
            {
                variable = variablesData.data[i];

                let subSelect = document.createElement("select");
                subSelect.id = variable.id;
                subSelect.name = variable.name;

                let emptyOpinion = document.createElement("option");
                emptyOpinion.value = "";
                emptyOpinion.text = `${variable.name}: Empty`;
                subSelect.appendChild(emptyOpinion);

                for (let [valueId, valueName] of Object.entries(variable.values.choices))
                {
                    
                    let option = document.createElement("option");
                    option.value = `var-${variable.id}=${valueId}`;
                    option.text = `${variable.name}: ${valueName}`;
                    subSelect.appendChild(option);

                }

                subSelect.addEventListener('change', getLeaderboard);

                varDiv.appendChild(subSelect);
            }
        }
        
    }

    select.onchange = () =>
    {
        const allVarDivs = document.querySelectorAll("[id$='variables']");
        allVarDivs.forEach(d => d.style.display = "none");

        const selectedDiv = document.getElementById(`${select.value}-variables`);
        if (selectedDiv) selectedDiv.style.display = "block";

        getLeaderboard();


    };

    
    if (select.options.length > 0)
    {
        select.value = select.options[0].value;
        select.onchange();
    }


    let gameCover = document.getElementById("gameCover");

    let gameName = document.getElementById("gameName");

    gameName.innerHTML = currGame.names.international;

    gameCover.src = currGame.assets["cover-large"].uri
    gameCover.style.display = "inline";

    select.style.display = "block";
}


async function getLeaderboard() {
    let categoryID = select.value;
    let varDiv = document.getElementById(`${categoryID}-variables`);
    const playersDiv = document.getElementById("players");

    playersDiv.innerHTML = "";

    let queryParams = [];
    if (varDiv) {
        let varSelects = varDiv.querySelectorAll("select");
        varSelects.forEach(sel => {
            if (sel.value) queryParams.push(sel.value);
        });
    }

    let leaderboardUrl = `https://www.speedrun.com/api/v1/leaderboards/${gameID}/category/${categoryID}`;
    if (queryParams.length > 0) leaderboardUrl += "?" + queryParams.join("&");

    const leaderboardAPI = await fetch(leaderboardUrl);
    const leaderboardData = await leaderboardAPI.json();

    const run = leaderboardData.data.runs[0].run;
    if (run.videos && run.videos.links && run.videos.links.length > 0)
    {
        let url = run.videos.links[0].uri;
        console.log(url);
        let videoID, embedURL;
    
        if (url.includes("youtu.be/"))
        {
            videoID = url.split("youtu.be/")[1];
            embedURL = `https://www.youtube.com/embed/${videoID}`;
        }

        else if (url.includes("watch?v="))
        {
            videoID = url.split("v=")[1].split("&")[0];
            embedURL = `https://www.youtube.com/embed/${videoID}`;
        }

        else if (url.includes("twitch.tv/videos/"))
        {
            videoID = url.split("twitch.tv/videos/")[1];
            embedURL = `https://player.twitch.tv/?video=${videoID}&parent=127.0.0.1`; 
        }

        if (videoID) {
            let oldVideo = document.getElementById("wrVideo");
            if (oldVideo) oldVideo.remove();

            wrVideo = document.createElement("iframe");
            wrVideo.id = "wrVideo";
            wrVideo.src = embedURL;
            wrVideo.width = "50%";
            wrVideo.height = "500px";
            wrVideo.allowFullscreen = "true";

            document.getElementById("gameBody").appendChild(wrVideo);
        }
    }
    else
    {
        console.log("This run doesn't have video!");
    }

    const addedPlayers = new Set();
    for (let user of run.players) {
        if (user.rel !== "user") continue;
        if (!user.id) continue;
        if (addedPlayers.has(user.id)) continue;

        addedPlayers.add(user.id);
        await addPlayer(user.id);
    }

    time = run.times.primary_t;
    document.getElementById("lbTime").innerHTML = timeConventer(time);
}


async function addPlayer(id) {
    const playersDiv = document.getElementById("players");

    if (playersDiv.querySelector(`[data-user-id='${id}']`)) return;

    const player = document.createElement("div");
    player.className = "playerStyle";
    player.dataset.userId = id;

    const userAPI = await fetch(`https://www.speedrun.com/api/v1/users/${id}`);
    const userData = await userAPI.json();

    // Додаємо ім'я
    const username = document.createElement("label");
    username.className = "marhey-text";
    username.id = "lbUsername";
    username.textContent = userData.data.names.international;
    player.appendChild(username);

    if (userData.data.location?.country) {
        const flag = document.createElement("img");
        flag.className = "flagIMG";
        let flagCode = userData.data.location.country.code.replace("/", "-");
        flag.src = `https://flagcdn.com/h40/${flagCode}.png`;
        player.appendChild(flag);
    }

    playersDiv.appendChild(player);
}


function timeConventer(t)
{
    let hours = Math.floor(t / 3600)
    let minutes = Math.floor((t % 3600) / 60);
    let seconds = Math.floor(t % 60);
    let milliseconds = Math.round((t % 1) * 1000);

    let formattedHours = String(hours).padStart(2, "0");
    let formattedMinutes = String(minutes).padStart(2, "0");
    let formattedSeconds = String(seconds).padStart(2, "0");
    let formattedMilliseconds = String(milliseconds).padStart(3, "0");

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`
}