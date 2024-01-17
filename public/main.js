const messagesDiv = document.getElementById("messages");
messagesDiv.className = "message-grid"; // Add class for grid layout

function fetchMessages() {
  fetch("http://localhost:3001/messages?status=Accepted")
    .then((response) => response.json())
    .then((data) => {
      messagesDiv.innerHTML = "";

      data.forEach((record) => {
        const recordDiv = document.createElement("div");
        recordDiv.className = "message-record"; 

        const p = document.createElement("p");
        p.textContent = record.fields.Message;
        recordDiv.appendChild(p);

        const imageUrl = record.fields.ImageUrl;
        if (imageUrl && imageUrl.length > 0) {
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = "Image for message: " + record.fields.Message;
          img.style.maxWidth = "200px";
          recordDiv.appendChild(img);
        }

        messagesDiv.appendChild(recordDiv);
      });
    })
    .catch((error) => console.error("Error:", error));
}

setInterval(fetchMessages, 60000);
fetchMessages();
