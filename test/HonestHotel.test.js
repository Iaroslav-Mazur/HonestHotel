const { expect } = require("chai");
const defaultRoomCount = 50;

describe("HonestHotel", () => {
  let owner;
  let addr1;
  let addr2;

  let honestHotel;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    const HonestHotel = await ethers.getContractFactory('HonestHotel');
    honestHotel = await HonestHotel.deploy(defaultRoomCount);
  });


  it("should correctly emit events", async () => {
    let addr1Address = await addr1.getAddress();
    await expect(honestHotel.connect(addr1).occupyRooms([1,3,5,7])).to.emit(honestHotel, "RoomOccupied").withArgs(1, addr1Address)
                                                                   .to.emit(honestHotel, "RoomOccupied").withArgs(3, addr1Address)
                                                                   .to.emit(honestHotel, "RoomOccupied").withArgs(5, addr1Address)
                                                                   .to.emit(honestHotel, "RoomOccupied").withArgs(7, addr1Address);

    let addr2Address = await addr2.getAddress();
    await expect(honestHotel.connect(addr2).occupyRooms([2,4])).to.emit(honestHotel, "RoomOccupied").withArgs(2, addr2Address)
                                                               .to.emit(honestHotel, "RoomOccupied").withArgs(4, addr2Address);

    await expect(honestHotel.connect(addr1).freeRooms([1,3])).to.emit(honestHotel, "RoomFreed").withArgs(1, addr1Address, addr1Address)
                                                             .to.emit(honestHotel, "RoomFreed").withArgs(3, addr1Address, addr1Address);

    let ownerAddress = await owner.getAddress();
    await expect(honestHotel.connect(owner).forceFreeRooms([2,5])).to.emit(honestHotel, "RoomFreed").withArgs(2, addr2Address, ownerAddress)
                                                                  .to.emit(honestHotel, "RoomFreed").withArgs(5, addr1Address, ownerAddress);

    await expect(honestHotel.connect(owner).forceFreeAllRooms()).to.emit(honestHotel, "RoomFreed").withArgs(7, addr1Address, ownerAddress)
                                                                .to.emit(honestHotel, "RoomFreed").withArgs(4, addr2Address, ownerAddress);

  });


  it("should return room count", async () => {
    const tx = honestHotel.connect(addr1).getRoomCount();
    expect(await tx).to.equal(defaultRoomCount);
  });

  it("should increase room count when called by the owner", async () => {
    let increment = 5;
    await honestHotel.connect(owner).increaseRoomCountBy(increment);
    expect(await honestHotel.getRoomCount()).to.equal(defaultRoomCount + increment);
  });

  it("should revert when increaseRoomCountBy is called by anyone but the owner", async () => {
    expect(honestHotel.connect(addr1).increaseRoomCountBy(5)).to.be.revertedWith('Caller is not owner');
  });


  it("should let the user free the rooms occupied by him", async () => {
    await expect(honestHotel.connect(addr1).occupyRooms([0,1,2,3]));
    honestHotel.connect(addr1).freeRooms([1,2]);
    expect(await honestHotel.connect(addr1).getOccupiedRoomsNr()).to.equal(2);
  });

  it("should remove the client from the list when he frees the last room he occupied", async () => {
    await honestHotel.connect(addr1).occupyRooms([0,1,2]);
    await honestHotel.connect(addr1).freeRooms([1,2]);
    await honestHotel.connect(addr1).freeRooms([0]);
    expect(await honestHotel.connect(addr1).getOccupiedRoomsNr()).to.equal(0);
  });


  it("shouldn't let you occupy a room that's already occupied", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    expect(honestHotel.connect(addr2).occupyRooms([0])).to.be.revertedWith("Your reservation cannot be completed, because a room you want is already occupied");
  });

  it("shouldn't let you occupy a room the number of which is out of range", async () => {
    expect(honestHotel.connect(addr1).occupyRooms([defaultRoomCount])).to.be.revertedWith("The room number is out of range");
  });

  it("shouldn't let the user occupy too many rooms", async () => {
    let roomsToOccupy = Array.from(Array(defaultRoomCount+1).keys())
    expect(honestHotel.connect(addr1).occupyRooms(roomsToOccupy)).to.be.revertedWith("The number of rooms you are trying to reserve is too big");
  });


  it("shouldn't let you free a room the number of which is out of range", async () => {
    expect(honestHotel.connect(addr1).freeRooms([defaultRoomCount])).to.be.revertedWith("The room number is out of range");
  });

  it("shouldn't let you free a room you don't occupy", async () => {
    honestHotel.connect(addr1).occupyRooms([0,1]);
    expect(honestHotel.connect(addr1).freeRooms([2,3])).to.be.revertedWith("You are not allowed to free a room you don't occupy");
  });

  it("shouldn't let the user free too many rooms", async () => {
    let roomsToFree = Array.from(Array(defaultRoomCount+1).keys())
    expect(honestHotel.connect(addr1).freeRooms(roomsToFree)).to.be.revertedWith("The number of rooms you are trying to free is too big");
  });
  

  it("should let the owner forceFreeRooms", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    await honestHotel.connect(addr2).occupyRooms([1]);
    await honestHotel.connect(addr1).occupyRooms([2,3]);
    await honestHotel.connect(owner).forceFreeRooms([0,1,2,3]);
    expect(await honestHotel.connect(owner).getOccupiedRoomsNr()).to.equal(0);
  });

  it("should revert when forceFreeRooms is called by anyone but the owner", async () => {
    expect(honestHotel.connect(addr1).forceFreeRooms([1,2])).to.be.revertedWith('Caller is not owner');
  });

  it("shouldn't let the owner forceFreeRooms the number of which is out of range", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    await honestHotel.connect(addr2).occupyRooms([1]);
    await honestHotel.connect(addr1).occupyRooms([2,3]);
    expect(honestHotel.connect(owner).forceFreeRooms([defaultRoomCount])).to.be.revertedWith("The room number is out of range");
  });

  it("shouldn't let the owner forceFreeRooms that are not occupied", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    await honestHotel.connect(addr2).occupyRooms([1]);
    await honestHotel.connect(addr1).occupyRooms([2,3]);
    expect(honestHotel.connect(owner).forceFreeRooms([4])).to.be.revertedWith("The room cannot be freed, because it is not occupied");
  });

  it("shouldn't let the owner forceFree too many rooms", async () => {
    let roomsToFree = Array.from(Array(defaultRoomCount+1).keys())
    expect(honestHotel.connect(owner).forceFreeRooms(roomsToFree)).to.be.revertedWith("The number of rooms you are trying to free is too big");
  });


  it("should let the owner forceFreeAllRooms", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    await honestHotel.connect(addr2).occupyRooms([1]);
    await honestHotel.connect(addr1).occupyRooms([2,3]);
    await honestHotel.connect(owner).forceFreeAllRooms();
    expect(await honestHotel.connect(owner).getOccupiedRoomsNr()).to.equal(0);
  });

  it("should revert when forceFreeAllRooms is called by anyone but the owner", async () => {
    expect(honestHotel.connect(addr1).forceFreeAllRooms()).to.be.revertedWith('Caller is not owner');
  });

  it("should let the owner forceFreeAllRooms when there are no clients occupying them", async () => {
    await honestHotel.connect(owner).forceFreeAllRooms();
  });

  it("should support complex use-cases", async () => {
    await honestHotel.connect(addr1).occupyRooms([0]);
    await honestHotel.connect(addr2).occupyRooms([4]);
    await honestHotel.connect(addr1).occupyRooms([2,3]);
    await honestHotel.connect(addr2).occupyRooms([1]);
    expect(await honestHotel.connect(addr2).getOccupiedRoomsNr()).to.equal(5);

    await honestHotel.connect(addr2).freeRooms([1]);
    await honestHotel.connect(addr1).freeRooms([3,2]);
    expect(await honestHotel.connect(addr2).getOccupiedRoomsNr()).to.equal(2);

    await honestHotel.connect(addr2).occupyRooms([10,15,20]);
    await honestHotel.connect(addr1).occupyRooms([11,21,31]);
    expect(await honestHotel.connect(addr2).getOccupiedRoomsNr()).to.equal(8);

    await honestHotel.connect(owner).forceFreeRooms([10,21,20]);
    expect(await honestHotel.connect(addr2).getOccupiedRoomsNr()).to.equal(5);

    await honestHotel.connect(owner).forceFreeAllRooms();
    expect(await honestHotel.connect(addr2).getOccupiedRoomsNr()).to.equal(0);
  });


  it("should have the right owner", async () => {
    expect(await honestHotel.connect(addr1).getOwner()).to.equal(await owner.getAddress());
  });

  it("should allow changing the owner", async () => {
    await honestHotel.connect(owner).changeOwner(addr1.getAddress());
    let newOwnerAddress = await honestHotel.connect(owner).getOwner();
    let addr1Address = await addr1.getAddress();
    expect(newOwnerAddress).to.equal(addr1Address);
  });

  it("shouldn't let anyone but the owner change the owner", async () => {
    expect(honestHotel.connect(addr1).changeOwner(addr1.getAddress())).to.be.revertedWith("Caller is not owner");
  });
});