// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0;

import "./Owner.sol";

contract HonestHotel is Owner{
    mapping(address => uint[]) private addressToRooms;
    mapping(uint => address) private roomToAddress;
    address[] private clients;
    uint private roomCount;

    event RoomOccupied(uint roomNr, address client);
    event RoomFreed(uint roomNr, address lastTenant, address freedBy);

    constructor(uint _roomCount) {
        roomCount = _roomCount;
    }

    function getRoomCount() public view returns (uint) {
        return roomCount;
    }

    function getOccupiedRoomsNr() public view returns (uint) {
        uint occupiedRoomsNr = 0;
        for (uint roomNr = 0; roomNr <= roomCount-1; roomNr++)
        {
            if (roomToAddress[roomNr] != address(0))
                occupiedRoomsNr++;
        }

        return occupiedRoomsNr;
    }

    function occupyRooms(uint[] calldata roomNumbers) public {
        require(roomNumbers.length <= roomCount, "The number of rooms you are trying to reserve is too big");
        
        for (uint i = 0; i <= roomNumbers.length-1; i++)
        {
            uint roomNr = roomNumbers[i];
            require(roomNr <= roomCount - 1, "The room number is out of range");
            require(roomToAddress[roomNr] == address(0), "Your reservation cannot be completed, because a room you want is already occupied");

            //are these changes persisted to the blockchain if one of the following iterations fails?
            clients.push(msg.sender);
            addressToRooms[msg.sender].push(roomNr);
            roomToAddress[roomNr] = msg.sender;
            emit RoomOccupied(roomNr, msg.sender);
        }
    }

    function freeRooms(uint[] calldata roomNumbers) public {
        require(roomNumbers.length <= roomCount, "The number of rooms you are trying to free is too big");
        
        for (uint i = 0; i <= roomNumbers.length-1; i++)
        {
            uint roomNr = roomNumbers[i];
            require(roomNr <= roomCount - 1, "The room number is out of range");
            require(isUintInList(roomNr, addressToRooms[msg.sender]), "You are not allowed to free a room you don't occupy");

            removeElementFromUintArrayByValue(addressToRooms[msg.sender], roomNr);
            if (addressToRooms[msg.sender].length == 0)
                removeClientByAddress(msg.sender);

            roomToAddress[roomNr] = address(0);
            emit RoomFreed(roomNr, msg.sender, msg.sender);
        }
    }

    function forceFreeRooms(uint[] calldata roomNumbers) public isOwner {
        require(roomNumbers.length <= roomCount, "The number of rooms you are trying to free is too big");
        
        for (uint i = 0; i <= roomNumbers.length-1; i++)
        {
            uint roomNr = roomNumbers[i];
            require(roomNr <= roomCount - 1, "The room number is out of range");
            require(roomToAddress[roomNr] != address(0), "The room cannot be freed, because it is not occupied");

            address roomOccupant = roomToAddress[roomNr]; 
            removeElementFromUintArrayByValue(addressToRooms[roomOccupant], roomNr);
            if (addressToRooms[roomOccupant].length == 0)
                removeClientByAddress(roomOccupant);

            roomToAddress[roomNr] = address(0);
            emit RoomFreed(roomNr, roomOccupant, msg.sender);
        }
    }

    function forceFreeAllRooms() public isOwner {
        if (clients.length == 0)
            return;

        for (uint i = 0; i <= clients.length - 1; i++)
        {
            delete addressToRooms[clients[i]];
        }
        
        delete clients;

        for (uint i = 0 ; i <= roomCount; i++)
        {
            address roomOccupant = roomToAddress[i];
            if (roomOccupant != address(0))
            {
                roomToAddress[i] = address(0);
                emit RoomFreed(i, roomOccupant, msg.sender);
            }
        }
    }

    function increaseRoomCountBy(uint roomsToAdd) public isOwner {
        roomCount += roomsToAdd;
    }

    function isUintInList(uint searchedNr, uint[] memory nrArray) public pure returns(bool) {
        for (uint i = 0; i <= nrArray.length-1; i++)
        {
            if (nrArray[i] == searchedNr)
                return true;
        }

        return false;
    }


    function removeElementFromUintArrayByValue(uint[] storage array, uint value) private {
        uint index = getElementIdInUintArrayByValue(array, value);
        removeElementFromUintArrayById(array, index);
    }

    function getElementIdInUintArrayByValue(uint[] storage array, uint value) private view returns(uint) {
        for (uint i = 0; i <= array.length - 1; i++)
        {
            if (array[i] == value)
                return i;
        }

        revert("The submitted value couldn't be found in the respective array!");
    }

    function removeElementFromUintArrayById(uint[] storage array, uint id) private {
        if (array.length == 0 || id >= array.length)
            revert();

        array[id] = array[array.length - 1];
        array.pop();
    }


    function removeClientById(uint index) private {
        clients[index] = clients[clients.length - 1];
        clients.pop();
    }

    function removeClientByAddress(address client) private {
        uint index = getClientIdByAddress(client);
        removeClientById(index);
    }

    function getClientIdByAddress(address client) private view returns(uint) {
        for (uint i = 0; i <= clients.length - 1; i++)
        {
            if (clients[i] == client)
                return i;
        }

        revert("The respective address is not a client of the Honest Hotel!");
    }
}