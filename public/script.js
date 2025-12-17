const video = document.getElementById("preview");
const startButton = document.getElementById("start");

startButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    alert("Camera started successfully");
  } catch (err) {
    console.error(err);
    alert("Camera failed: " + err.message);
  }
});
