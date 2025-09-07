const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const path = require("path");

const contractABI = require("./AuthManagerABI.json");
const contractAddress = "0xCe2519369b6472bCdbcde62Ec039309E646BD160";
const ADMIN_WALLET = "0xd67574D6Cee346076B769A6f91f1Af48a55FD116";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }, // 10 minutes
  }),
);

const provider = new ethers.JsonRpcProvider(
  "https://sepolia.infura.io/v3/b38cf753021449a584d8a9ea94fce34c",
);
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// --------- FRONTEND WALLET LOGIN ---------
app.post("/wallet-login", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "No wallet provided" });

  req.session.wallet = wallet;
  req.session.lastWalletAuth = Date.now();
  res.json({ success: true, message: "Wallet logged in" });
});

// --------- IOT DEVICE AUTH (RFID + PASSWORD) ---------
app.post("/iot-auth", async (req, res) => {
  try {
    if (!req.session.wallet) {
      return res
        .status(401)
        .json({ error: "No wallet session. Connect MetaMask first." });
    }

    const { rfid, password } = req.body;
    if (!rfid || !password) {
      return res.status(400).json({ error: "Missing RFID or password" });
    }

    const wallet = req.session.wallet;

    const isAuth = await contract.authenticate(wallet, rfid, password);
    if (!isAuth) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    req.session.user = {
      wallet,
      rfid,
      lastFullAuth: Date.now(),
      lastWalletAuth: Date.now(),
    };

    return res.json({
      success: true,
      message: "Full authentication successful",
      redirect: "/dashboard.html",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------- SESSION CHECK ---------
app.get("/check-session", (req, res) => {
  if (!req.session.user)
    return res.json({ authenticated: false, reason: "Not logged in" });

  const elapsed = (Date.now() - req.session.user.lastFullAuth) / 1000;
  if (elapsed > 600) {
    req.session.destroy();
    return res.json({ authenticated: false, reason: "Full reauth required" });
  } else if (elapsed > 300) {
    return res.json({ authenticated: false, reason: "Wallet reauth required" });
  }

  return res.json({ authenticated: true, wallet: req.session.user.wallet });
});

// --------- ADMIN ENDPOINTS ---------
app.post("/admin/bind", async (req, res) => {
  const { wallet, rfid, password, adminWallet } = req.body;
  if (adminWallet !== ADMIN_WALLET)
    return res.status(403).json({ error: "Forbidden" });

  // Normally this should sign and send tx using admin private key
  res.json({ success: true, message: `Bound wallet ${wallet}` });
});

app.get("/admin/users", (req, res) => {
  if (!req.query.adminWallet || req.query.adminWallet !== ADMIN_WALLET)
    return res.status(403).json({ error: "Forbidden" });

  res.json({ users: req.session });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
