// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

struct Bet {
    uint256 amount;
    bool isTrue;
}

struct Event {
    address owner;
    uint256 bookmakerFee;
    uint256 trueAmount;
    uint256 falseAmount;
    bool finished;
    bool winner;
    address token;
    uint256 finalCoefficient;
}

contract Bookmaker {
    address public owner;
    uint public bookmakerFee;
    uint public bookmakerFeePercentage;

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => Bet)) public bets;
    mapping(address => uint256) public bookmakerFees;
    uint256 public eventCount;

    constructor() {}
    
    function createEvent(uint256 _bookmakerFee, address _token) public {
        Event memory _event = Event({
            owner: msg.sender,
            bookmakerFee: _bookmakerFee,
            trueAmount: 0,
            falseAmount: 0,
            finished: false,
            winner: false,
            token: _token,
            finalCoefficient: 0
        });
        events[eventCount] = _event;
        eventCount++;
    }

    function getEvent(uint256 _eventId) public view returns (Event memory) {
        return events[_eventId];
    }

    function editEvent(uint256 _eventId, uint256 _bookmakerFee) public {
        require(msg.sender == events[_eventId].owner, "You are not the owner of this event");
        events[_eventId].bookmakerFee = _bookmakerFee;
    }

    function finishEvent(uint256 _eventId, bool _winner) public {
        require(msg.sender == events[_eventId].owner, "You are not the owner of this event");
        events[_eventId].finished = true;
        events[_eventId].winner = _winner;
        if (_winner) {
            events[_eventId].finalCoefficient = events[_eventId].falseAmount == 0 ? 0 : events[_eventId].trueAmount * 1000000 / events[_eventId].falseAmount;
        } else {
            events[_eventId].finalCoefficient = events[_eventId].trueAmount == 0 ? 0 : events[_eventId].falseAmount * 1000000 / events[_eventId].trueAmount;
        }
        bookmakerFees[events[_eventId].owner] += events[_eventId].bookmakerFee * (events[_eventId].trueAmount + events[_eventId].falseAmount);
    }

    function bet(uint256 _eventId, bool _isTrue, uint256 _amount) public {
        require(events[_eventId].finished == false, "Event is finished");
        
        IERC20 token = IERC20(events[_eventId].token);
        token.transferFrom(msg.sender, address(this), _amount);

        if (_isTrue) {
            events[_eventId].trueAmount += _amount;
        } else {
            events[_eventId].falseAmount += _amount;
        }

        bets[_eventId][msg.sender] = Bet({
            amount: _amount,
            isTrue: _isTrue
        });
    }
    
    function withdraw(uint256 _eventId) public {
        require(events[_eventId].finished == true, "Event is not finished");
        require(events[_eventId].winner == true, "You are not the winner");
        require(bets[_eventId][msg.sender].amount > 0, "You have no bets on this event");

        IERC20 token = IERC20(events[_eventId].token);
        token.transfer(msg.sender, bets[_eventId][msg.sender].amount * (1 + events[_eventId].finalCoefficient / 1000000 - events[_eventId].bookmakerFee / 10000));
        
        delete bets[_eventId][msg.sender];
    }

    function withdrawBookmaker(uint256 _eventId) public {
        require(msg.sender == events[_eventId].owner, "You are not the owner of this event");
        require(events[_eventId].finished == true, "Event is not finished");

        IERC20 token = IERC20(events[_eventId].token);
        token.transfer(msg.sender, bookmakerFees[events[_eventId].owner]);
    }
}
