import axios from "axios";
import * as fighterRepository from "../repositories/fighterRepository.js";

export async function find() {
  return fighterRepository.find();
}

interface Fighters {
  firstUser: string;
  secondUser: string;
}

export async function battle(fighters: Fighters) {
  const { firstUser, secondUser } = fighters;

  const firstUserRepos = await getFighterRepos(firstUser);
  const secondUserRepos = await getFighterRepos(secondUser);

  const firstFighter = await getFighter(firstUser);
  const secondFighter = await getFighter(secondUser);

  const firstUserStarCount = getFighterStarCount(firstUserRepos);
  const secondUserStarCount = getFighterStarCount(secondUserRepos);

  return getBattleResult({
    firstFighter,
    secondFighter,
    firstUserStarCount,
    secondUserStarCount,
  });
}

async function getFighterRepos(username: string) {
  const { data } = await axios.get(
    `https://api.github.com/users/${username}/repos`
  );

  return data;
}

async function getFighter(username: string) {
  const fighter = await fighterRepository.findByUsername(username);

  if (!fighter) {
    const createdFighter = await fighterRepository.insert(username);
    return { id: createdFighter.id, username, wins: 0, losses: 0, draws: 0 };
  }

  return fighter;
}

function getFighterStarCount(fighterRepos: any[]) {
  const repoStars = fighterRepos.map((repo) => repo.stargazers_count);
  if (repoStars.length === 0) return 0;

  return repoStars.reduce((current: number, sum: number) => sum + current);
}

interface FightersData {
  firstFighter: any;
  secondFighter: any;
  firstUserStarCount: number;
  secondUserStarCount: number;
}

async function getBattleResult(fightersData: FightersData) {
  const {
    firstFighter,
    secondFighter,
    firstUserStarCount,
    secondUserStarCount,
  } = fightersData;
  if (firstUserStarCount > secondUserStarCount) {
    await updateWinnerAndLoserStats({
      winnerId: firstFighter.id,
      loserId: secondFighter.id,
    });

    return {
      winner: firstFighter.username,
      loser: secondFighter.username,
      draw: false,
    };
  }

  if (secondUserStarCount < firstUserStarCount) {
    await updateWinnerAndLoserStats({
      winnerId: secondFighter.id,
      loserId: firstFighter.id,
    });
    return {
      winner: secondFighter.username,
      loser: firstFighter.username,
      draw: false,
    };
  }

  await updateDrawStats({firstFighterId: firstFighter.id, secondFighterId: secondFighter.id});
  return { winner: null, loser: null, draw: true };
}

interface FightResult {
  winnerId: number;
  loserId: number;
}

async function updateWinnerAndLoserStats(fightResult: FightResult) {
  const { winnerId, loserId } = fightResult;

  await fighterRepository.updateStats({id: winnerId, column: "wins"});
  await fighterRepository.updateStats({id: loserId, column: "losses"});
}

interface DrawFighters {
  firstFighterId: number;
  secondFighterId: number;
}

async function updateDrawStats(drawFighters: DrawFighters) {
  const { firstFighterId, secondFighterId } = drawFighters;

  await fighterRepository.updateStats({id: firstFighterId, column: "draws"});
  await fighterRepository.updateStats({id: secondFighterId, column: "draws"});
}
