window.addEventListener('load', async () => {
    if (IS_ADMIN) {
        isSessionActive();
        setInterval(() => {
            isSessionActive();
        }, 1000 * 60 * 5)
    }

    document.querySelector(".join").addEventListener("click", (e) => {
        e.preventDefault();
        joinSession();
    });

    document.querySelector(".end").addEventListener("click", (e) => {
        e.preventDefault();
        if (IS_ADMIN) {
            endSession();
        }
    });
});

async function joinSession() {
    const res = await sendAPIRequest("/room/join", {});
    if (res.status) {
        const url = window.PLUG_N_MEET_SERVER_URL + "/?access_token=" + res.token;
        window.open(url, "_blank");
        
        if (IS_ADMIN) {
            document.querySelector(".end").style.display = "";
        }
    } else {
        alert(res.msg);
    }
}

async function endSession() {
    const res = await sendAPIRequest("/room/end", {});
    if (res.status) {
        document.querySelector(".end").style.display = "none";
    } else {
        alert(res.msg);
    }
}

async function isSessionActive() {
    const res = await sendAPIRequest("/room/isActive", {});
    const btn = document.querySelector(".end");
    if (res.status) {
        btn.style.display = "";
    } else {
        btn.style.display = "none";
    }
}

async function sendAPIRequest(path, body) {
    const url = window.PLUG_N_MEET_SERVER_URL + '/lti/v1/api' + path;
    const output = {
        status: false,
        msg: ""
    }
    try {
        const res = await axios.post(url, JSON.stringify(body), {
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            },
        });
        return res.data;
    } catch (e) {
        output.msg = e.response;
    }

    return output;
};