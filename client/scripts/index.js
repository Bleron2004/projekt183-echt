document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
  }

  const generateTweet = (tweet) => {
    const date = new Date(tweet.timestamp).toLocaleDateString("de-CH", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    return `
        <div id="feed" class="flex flex-col gap-2 w-full">
            <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400">
                <img src="./img/tweet.png" alt="SwitzerChees" class="w-14 h-14 rounded-full" />
                <div class="flex flex-col grow">
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-gray-200">
                    <h3 class="font-semibold">${tweet.username}</h3>
                    <p class="text-sm">${date}</p>
                    </div>
                </div>
                <p>${tweet.text}</p>
                </div>
            </div>
        </div>
      `;
  };

  const getFeed = async () => {
    const response = await fetch("/api/feed");
    const tweets = await response.json();
    document.getElementById("feed").innerHTML = tweets.map(generateTweet).join("");
  };

  const postTweet = async () => {
    const text = newTweetInput.value;

    const response = await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      await getFeed();
      newTweetInput.value = "";
    } else {
      alert("Fehler beim Posten.");
    }
  };

  postTweetButton.addEventListener("click", postTweet);
  newTweetInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      postTweet();
    }
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });

  getFeed();
});
