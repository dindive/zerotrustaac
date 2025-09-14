// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuthManager {
    address public admin;

    struct User {
        string rfid;
        string passwordHash; // store hash of password
        bool registered;
    }

    mapping(address => User) private users;
    address[] private loggedInUsers;

    constructor(address _admin) {
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    function isAdmin(address wallet) public view returns (bool) {
        return wallet == admin;
    }

    function bindUser(address wallet, string memory rfid, string memory passwordHash) public onlyAdmin {
        users[wallet] = User(rfid, passwordHash, true);
    }

    function authenticate(address wallet, string memory rfid, string memory passwordHash) public view returns (bool) {
        if (!users[wallet].registered) return false;
        return (keccak256(abi.encodePacked(users[wallet].rfid)) == keccak256(abi.encodePacked(rfid)) &&
                keccak256(abi.encodePacked(users[wallet].passwordHash)) == keccak256(abi.encodePacked(passwordHash)));
    }

    function isRegistered(address wallet) public view returns (bool) {
        return users[wallet].registered;
    }

    function getAllUsers() public view onlyAdmin returns (address[] memory) {
        return loggedInUsers;
    }

    // --- Get details of a single user (admin only) ---
    function getUser(address wallet) public view onlyAdmin returns (string memory, string memory, bool) {
        User memory u = users[wallet];
        return (u.rfid, u.passwordHash, u.registered);
    }
}
