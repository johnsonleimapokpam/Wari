const { io } =
require("socket.io-client");

const socket = io(
  "http://localhost:5000",
  {
    auth: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OTNkMzFjZi1kNjU1LTRmY2UtYWVkOS05NTUxMzhkZmRlY2UiLCJlbWFpbCI6ImpvaG5zb25Abm90cmVxZC5jb20iLCJpYXQiOjE3ODA1NTYxMzcsImV4cCI6MTc4MTE2MDkzN30.wcNIuQ2vDQmrJdNlTrd_WlEM6EaSu7L1IkxIdlAWoRs"
    }
  }
);

socket.on("connect_error", (err) => {
  console.error("CONNECT ERROR");
  console.error(err.message);
});

socket.on("connect", () => {
  console.log(
    "Connected:",
    socket.id
  );
});

socket.onAny((event, data) => {
  console.log(event, data);
});