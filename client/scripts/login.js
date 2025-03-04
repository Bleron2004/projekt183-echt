document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login");
  const errorText = document.getElementById("error");

  loginButton.addEventListener("click", async () => {
    errorText.innerText = "";

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        window.location.href = "/";
      } else {
        errorText.innerText = data.message || JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error("Fehler beim Login:", error);
      errorText.innerText = "Fehler beim Login. Bitte versuche es später erneut.";
    }
  });
});
