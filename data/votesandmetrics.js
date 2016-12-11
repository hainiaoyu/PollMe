const mongoCollections = require("../config/mongoCollections");
const users = mongoCollections.users;
const polls = mongoCollections.polls;
const votesAndMetrics = mongoCollections.votesAndMetrics;

const usersData = require("./users");
const pollsData = require("./polls");
const uuid = require('node-uuid');

let exportedMethods = {
    getVotesForPoll(pollId) {
        return votesAndMetrics().then((voteCollection) => {
            return voteCollection
                .findOne({ _id: pollId })
                .then((vote) => {
                    console.log(vote);

                    if (!vote) {
                        return Promise.reject(new Error("No Votes for selected Poll")).then(function (error) {
                            //not called
                        }, function (error) {
                            console.log(error);
                        });
                    } else {

                        return vote;
                    }
                });
        });
    },
    countVote(pollId, ansChoice1, ansChoice2, ansChoice3, ansChoice4, userId, userGender) {
        //Serach for the pollid in the votesAndMetrics collection since the _id is the same as the pollID that the votes belong to.
        return this.getVotesForPoll(pollId).then((votes) => {
            if (!votes) {
                //No Votes found for poll, so we create the votesAndMetrics document
                console.log("Creating Vote Document");
                this.createNewVoteDocument(pollId, ansChoice1, ansChoice2, ansChoice3, ansChoice4, userId, userGender);
            } else {
                //Poll has votes recorded already, so we need to update the votesAndMetrics document
                this.updateVoteDocument(pollId, ansChoice1, ansChoice2, ansChoice3, ansChoice4, userId, userGender);
                console.log("Document already created");
            }
        })

    },
    createNewVoteDocument(pollId, ansChoice1, ansChoice2, ansChoice3, ansChoice4, userId, userGender) {
        // answer choice will be either 0 or 1, if it's 1 then thats the answer they selected, 
        // i.e ansChoice1 =0 , ansChoice2 =0, ansChoice3 =1, ansChoice4 =0 means they voted for ansChoice3
        //  NOTE:  Only one ansChoiceX paramater passed in should be 1, the others should ALL be 0
        try {
            if (arguments.length != 7) {
                throw new Error("The number of argument is wrong");
            }
            if (typeof pollId != 'string') {
                throw new Error("pollId should be string");
            }
            if (typeof ansChoice1 != 'number' || typeof ansChoice2 != 'number' || typeof ansChoice3 != 'number' || typeof ansChoice4 != 'number') {
                throw new Error("ansChoice should be number");
            }
            if (typeof userId != 'string') {
                throw new Error("userId should be string");
            }

            let ansChoice1TotalVotesMale = 0;
            let ansChoice2TotalVotesMale = 0;
            let ansChoice3TotalVotesMale = 0;
            let ansChoice4TotalVotesMale = 0;
            let ansChoice1TotalVotesFemale = 0;
            let ansChoice2TotalVotesFemale = 0;
            let ansChoice3TotalVotesFemale = 0;
            let ansChoice4TotalVotesFemale = 0;
            let ansChoiceUserSelected = "";

            //this is to see which answer choice has the value of 1, from here we would then find the users's gender and then set the count to 1
            // if user is M set ansChoiceXTotalVotesMale = 1 else set ansChoiceXTotalVotesFemale = 1
            switch (1) {
                case ansChoice1:
                    ansChoiceUserSelected = "ansChoice1";
                    if (userGender == "M") {
                        ansChoice1TotalVotesMale = 1;
                    } else {
                        ansChoice1TotalVotesFemale = 1;
                    }
                    break;
                case ansChoice2:
                    ansChoiceUserSelected = "ansChoice2";
                    if (userGender == "M") {
                        ansChoice2TotalVotesMale = 1;
                    } else {
                        ansChoice2TotalVotesFemale = 1;
                    }
                    break;
                case ansChoice3:
                    ansChoiceUserSelected = "ansChoice3";
                    if (userGender == "M") {
                        ansChoice3TotalVotesMale = 1;
                    } else {
                        ansChoice3TotalVotesFemale = 1;
                    }
                    break;
                case ansChoice4:
                    ansChoiceUserSelected = "ansChoice4";
                    if (userGender == "M") {
                        ansChoice4TotalVotesMale = 1;
                    } else {
                        ansChoice4TotalVotesFemale = 1;
                    }
                    break;
            }
            return votesAndMetrics().then((voteCollection) => {
                let newVote = {
                    _id: pollId,
                    totalVotesForPoll: 1,
                    ansChoice1: { totalVotes: ansChoice1, totalVotesMale: ansChoice1TotalVotesMale, totalVotesFemale: ansChoice1TotalVotesFemale },
                    ansChoice2: { totalVotes: ansChoice2, totalVotesMale: ansChoice2TotalVotesMale, totalVotesFemale: ansChoice2TotalVotesFemale },
                    ansChoice3: { totalVotes: ansChoice3, totalVotesMale: ansChoice3TotalVotesMale, totalVotesFemale: ansChoice3TotalVotesFemale },
                    ansChoice4: { totalVotes: ansChoice4, totalVotesMale: ansChoice4TotalVotesMale, totalVotesFemale: ansChoice4TotalVotesFemale },
                };
                return voteCollection.insertOne(newVote).then((newInsertInformation) => {
                    return newInsertInformation.insertedId;
                }).then((newId) => {
                    return this.getVotesForPoll(newId);
                }).then((newId) => {
                    console.log(userId + ":" + newId._id);
                    return usersData.addPollVotedInToUser(userId, newId._id, ansChoiceUserSelected)
                });
            });
        } catch (e) {
            console.log(e);
        }
    },
    removeVote(id) {
        return votesAndMetrics().then((voteCollection) => {
            return voteCollection
                .removeOne({ _id: id })
                .then((deletionInfo) => {
                    if (deletionInfo.deletedCount === 0) {
                        throw (`Could not delete vote with id of ${id}`)
                    } else { }
                });
        });
    },
    //Needs testing and most likely modification
    updateVoteDocument(pollId, ansChoice1, ansChoice2, ansChoice3, ansChoice4, userId, userGender) {
        console.log ("updateVoteDocument 1");
        return pollsData.getPollById(pollId).then((poll) => {
            console.log ("updateVoteDocument 2");
            let ansChoiceUserSelected = "";
            let totalVotesForPoll = poll.totalVotesForPoll + 1;
            let totalVotesForAnsChoice = 0;
            let totalVotesMaleForAnsChoice = 0;
            let totalVotesFemaleForAnsChoice = 0;
            if (userGender == "M") {
                totalVotesMaleForAnsChoice = 1;
            } else {
                totalVotesFemaleForAnsChoice = 1;
            }
            console.log ("updateVoteDocument 3");
            switch (1) {
                case ansChoice1:
                console.log ("updateVoteDocument 4: case anschoice1");
                    ansChoiceUserSelected = "ansChoice1";
                    totalVotesForAnsChoice = poll.ansChoice1.totalVotes + 1;
                    totalVotesMaleForAnsChoice += poll.ansChoice1.totalVotesMale;
                    totalVotesFemaleForAnsChoice += poll.ansChoice1.totalVotesFemale;
                    //this needs to be done
                    console.log ("updateVoteDocument 5:");
                    return voteCollection.updateOne({ _id: pollId }, {
                        totalVotesForPoll: totalVotesForPoll, $set: { 'ansChoice1.$.totalVotes': totalVotesForAnsChoice },
                        $set: { 'ansChoice1.$.totalVotesMale': totalVotesMaleForAnsChoice }, $set: { 'ansChoice1.$.totalVotesFemale': totalVotesFemaleForAnsChoice }
                    }).then((result) => {
                        console.log ("updateVoteDocument 6:");
                        return this.getPollById(pollId).then((poll) => {
                            console.log ("updateVoteDocument 7:");
                            return usersData.addPollVotedInToUser(userId, poll._id, ansChoiceUserSelected)

                        });
                    });

                case ansChoice2:
                console.log ("updateVoteDocument 8: case anschoice2");
                    ansChoiceUserSelected = "ansChoice2";
                    totalVotesForAnsChoice = poll.ansChoice2.totalVotes + 1;
                    totalVotesMaleForAnsChoice += poll.ansChoice2.totalVotesMale;
                    totalVotesFemaleForAnsChoice += poll.ansChoice2.totalVotesFemale;
                    //this needs to be done
                    console.log ("updateVoteDocument 9:");
                    return voteCollection.updateOne({ _id: pollId }, {
                        totalVotesForPoll: totalVotesForPoll, $set: { 'ansChoice2.$.totalVotes': totalVotesForAnsChoice },
                        $set: { 'ansChoice2.$.totalVotesMale': totalVotesMaleForAnsChoice }, $set: { 'ansChoice2.$.totalVotesFemale': totalVotesFemaleForAnsChoice }
                    }).then((result) => {
                        onsole.log ("updateVoteDocument 10:");
                        return this.getPollById(pollId).then((poll) => {
                            console.log ("updateVoteDocument 11:");
                            return usersData.addPollVotedInToUser(userId, poll._id, ansChoiceUserSelected)
                            
                        });
                    });

                case ansChoice3:
                console.log ("updateVoteDocument 12: case anschoice3");
                    ansChoiceUserSelected = "ansChoice3";
                    totalVotesForAnsChoice = poll.ansChoice3.totalVotes + 1;
                    totalVotesMaleForAnsChoice += poll.ansChoice3.totalVotesMale;
                    totalVotesFemaleForAnsChoice += poll.ansChoice3.totalVotesFemale;
                    //this needs to be done
                    console.log ("updateVoteDocument 13:");
                    return voteCollection.updateOne({ _id: pollId }, {
                        totalVotesForPoll: totalVotesForPoll, $set: { 'ansChoice3.$.totalVotes': totalVotesForAnsChoice },
                        $set: { 'ansChoice3.$.totalVotesMale': totalVotesMaleForAnsChoice }, $set: { 'ansChoice3.$.totalVotesFemale': totalVotesFemaleForAnsChoice }
                    }).then((result) => {
                        console.log ("updateVoteDocument 14:");
                        return this.getPollById(pollId).then((poll) => {
                            console.log ("updateVoteDocument 15:");
                            return usersData.addPollVotedInToUser(userId, poll._id, ansChoiceUserSelected)

                        });
                    });

                case ansChoice4:
                console.log ("updateVoteDocument 16: case anschoice4");
                    ansChoiceUserSelected = "ansChoice4";
                    totalVotesForAnsChoice = poll.ansChoice4.totalVotes + 1;
                    totalVotesMaleForAnsChoice += poll.ansChoice4.totalVotesMale;
                    totalVotesFemaleForAnsChoice += poll.ansChoice4.totalVotesFemale;
                    //this needs to be done
                    console.log ("updateVoteDocument 17:");
                    return voteCollection.updateOne({ _id: pollId }, {
                        totalVotesForPoll: totalVotesForPoll, $set: { 'ansChoice4.$.totalVotes': totalVotesForAnsChoice },
                        $set: { 'ansChoice4.$.totalVotesMale': totalVotesMaleForAnsChoice }, $set: { 'ansChoice4.$.totalVotesFemale': totalVotesFemaleForAnsChoice }
                    }).then((result) => {
                        console.log ("updateVoteDocument 18:");
                        return this.getPollById(pollId).then((poll) => {
                            console.log ("updateVoteDocument 19:");
                            return usersData.addPollVotedInToUser(userId, poll._id, ansChoiceUserSelected)

                        });
                    });

            }
        })
    },
    updateVotes(pollId, totalVotesMaleForAnsChoice1, totalVotesMaleForAnsChoice2, totalVotesMaleForAnsChoice3, totalVotesMaleForAnsChoice4, totalVotesFemaleForAnsChoice1,
        totalVotesFemaleForAnsChoice2, totalVotesFemaleForAnsChoice3, totalVotesFemaleForAnsChoice4, totalVotesAns1, totalVotesAns2,totalVotesAns3,totalVotesAns4) {
        return votesAndMetrics().then((voteCollection) => {
            console.log(`PollID: ${pollId}  Male Ans Choice 1: ${totalVotesMaleForAnsChoice1} Male Ans Choice 2: ${totalVotesMaleForAnsChoice2} Male Ans Choice 3: ${totalVotesMaleForAnsChoice3} 
            Male Ans Choice 4: ${totalVotesMaleForAnsChoice4}`)

            console.log(`PollID: ${pollId}  Female Ans Choice 1: ${totalVotesFemaleForAnsChoice1} Female Ans Choice 2: ${totalVotesFemaleForAnsChoice2} Female Ans Choice 3: ${totalVotesFemaleForAnsChoice3} 
            Female Ans Choice 4: ${totalVotesFemaleForAnsChoice4}`)
            return voteCollection.updateOne({ _id: pollId }, {
                $set: {
                    "ansChoice1": {
                        "totalVotes": totalVotesAns1,
                        "totalVotesMale": totalVotesMaleForAnsChoice1,
                        "totalVotesFemale": totalVotesFemaleForAnsChoice1
                    },
                    "ansChoice2": {
                        "totalVotes": totalVotesAns2,
                        "totalVotesMale": totalVotesMaleForAnsChoice2,
                        "totalVotesFemale": totalVotesFemaleForAnsChoice2
                    },
                    "ansChoice3": {
                        "totalVotes": totalVotesAns3,
                        "totalVotesMale": totalVotesMaleForAnsChoice3,
                        "totalVotesFemale": totalVotesFemaleForAnsChoice3
                    },
                    "ansChoice4": {
                        "totalVotes": totalVotesAns4,
                        "totalVotesMale": totalVotesMaleForAnsChoice4,
                        "totalVotesFemale": totalVotesFemaleForAnsChoice4
                    }
                }

            })
        });
    },
    
    //Moved from users.js
    //THIS FUNCTION NOT DONE YET
    updateUser(id, updatedUser) {
        return usersData.getUserById(id).then((currentUser) => {
            if (currentUser.gender != updatedUser.gender) {
                //get votes for polls they voted in deincrement the total votes for the gener they were
                //and then increment the total number of votes for their new gender.  
                let pollsVotedIn = currentUser.pollsVotedIn;
                console.log(pollsVotedIn.length);
                for (let i = 0; i < pollsVotedIn.length; i++) {
                    let ansChoiceSelected = pollsVotedIn[i].ansChoiceSelected
                    let pollId = pollsVotedIn[i].pollId
                    //console.log(`Poll ID: ${pollId}, ansChoiceSelected: ${ansChoiceSelected} `)
                    this.getVotesForPoll(pollId).then((votes) => {
                        let totalVotesForPoll = votes.totalVotesForPoll;
                        let totalMaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesMale;
                        let totalMaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesMale;
                        let totalMaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesMale;
                        let totalMaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesMale;//votes.ansChoice4.totalVotesMale;
                        let totalFemaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesFemale;
                        let totalFemaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesFemale;
                        let totalFemaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesFemale;
                        let totalFemaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesFemale;
                        if (updatedUser == "F") {
                            console.log("changed to f " + ansChoiceSelected);
                            switch (ansChoiceSelected) {
                                case "ansChoice1":
                                    totalFemaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesFemale + 1;
                                    totalMaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesMale - 1;
                                    break;
                                case "ansChoice2":
                                    totalFemaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesFemale + 1;
                                    totalMaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesMale - 1;
                                    break;
                                case "ansChoice3":
                                    totalFemaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesFemale + 1;
                                    totalMaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesMale - 1;
                                    break;
                                case "ansChoice4":
                                    totalFemaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesFemale + 1;
                                    totalMaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesMale - 1;
                                    break;
                            }
                        } else {
                            console.log("changed to M");
                            switch (ansChoiceSelected) {
                                case "ansChoice1":
                                    totalFemaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesFemale - 1;
                                    totalMaleVotesForAnsChoice1 = votes.ansChoice1.totalVotesMale + 1;
                                    break;
                                case "ansChoice2":
                                    totalFemaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesFemale - 1;
                                    totalMaleVotesForAnsChoice2 = votes.ansChoice2.totalVotesMale + 1;
                                    break;
                                case "ansChoice3":
                                    totalFemaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesFemale - 1;
                                    totalMaleVotesForAnsChoice3 = votes.ansChoice3.totalVotesMale + 1;
                                    break;
                                case "ansChoice4":
                                    totalFemaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesFemale - 1;
                                    totalMaleVotesForAnsChoice4 = votes.ansChoice4.totalVotesMale + 1;
                                    break;
                            }
                        }
                        console.log(`Poll id ${pollId} Male: ${totalMaleVotesForAnsChoice1}, ${totalMaleVotesForAnsChoice2}, ${totalMaleVotesForAnsChoice3}, ${totalMaleVotesForAnsChoice4}`)
                        console.log(`Poll id ${pollId} FeMale: ${totalFemaleVotesForAnsChoice1}, ${totalFemaleVotesForAnsChoice2}, ${totalFemaleVotesForAnsChoice3}, ${totalFemaleVotesForAnsChoice4}`)
                        votesAndMetrics.updateVotes(pollId, totalMaleVotesForAnsChoice1, totalMaleVotesForAnsChoice2, totalMaleVotesForAnsChoice3, totalMaleVotesForAnsChoice4,
                            totalFemaleVotesForAnsChoice1, totalFemaleVotesForAnsChoice2, totalFemaleVotesForAnsChoice3, totalFemaleVotesForAnsChoice4,
                            votes.ansChoice1.totalVotes, votes.ansChoice2.totalVotes, votes.ansChoice3.totalVotes, votes.ansChoice4.totalVotes)
                    })
                }
                // })
            }
                let updatedUser = {
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    email: upatedUser.email,
                    gender: upatedUser.gender,
                    city: updateUser.city,
                    state: updatedUser.state,
                    age: updatedUser.age,
                    hashedPassword: updatedUser.hashedPassword
                };

                let updateCommand = {
                    $set: updatedUser
                };
                return users().then((userCollection) => {
                    return userCollection.updateOne({ _id: id }, updateCommand).then(() => {
                        return usersData.getUserById(id);
                    });
                }); 
        });
    },
    
    
    //moved from poll.js
    updatePoll(id, updatedPoll) {
        //Check if there are votes, if there are  then reject if not then call update
        getVotesForPoll(id).then((votes) => {
            if (votes.totalVotesForPoll > 0) {
                return Promise.reject(new Error("Cannot Update Poll that has votes")).then(function (error) {
                    // not called
                }, function (error) {
                    console.log(error);
                    console.log(`Total Votes: ${votes.totalVotesForPoll}`);
                });
            } else {
                //This may need to be modified to work correctly
                return polls().then((pollCollection) => {
                    let updatedPollData = {};

                    if (updatedPoll.category) {
                        updatedPollData.category = updatedPoll.category;
                    }

                    if (updatedPoll.question) {
                        updatedPollData.question = updatedPoll.question;
                    }
                    if (updatedPoll.ansChoice1) {
                        updatedPollData.ansChoice1 = updatedPoll.ansChoice1;
                    }
                    if (updatedPoll.ansChoice2) {
                        updatedPollData.ansChoice2 = updatedPoll.ansChoice2;
                    }
                    if (updatedPoll.ansChoice3) {
                        updatedPollData.ansChoice3 = updatedPoll.ansChoice3;
                    }
                    if (updatedPoll.ansChoice4) {
                        updatedPollData.ansChoice4 = updatedPoll.ansChoice4;
                    }
                    let updateCommand = {
                        $set: updatedPollData
                    };

                    return pollCollection.updateOne({
                        _id: id
                    }, updateCommand).then((result) => {
                        return this.getPollById(id);
                    });
                });
            }
        });
    },

}

module.exports = exportedMethods;
