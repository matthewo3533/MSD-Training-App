import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Delete all existing intakes to start fresh
  console.log('Deleting existing intakes...');
  await prisma.intake.deleteMany({});
  console.log('Existing intakes deleted.');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  // Create trainer user
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  const trainer = await prisma.user.upsert({
    where: { username: 'trainer' },
    update: {},
    create: {
      username: 'trainer',
      password: trainerPassword,
      role: 'TRAINER',
    },
  });

  // Note: Old trainees (trainee1, trainee2, trainee3) are kept for reference but not used in November intake

  // ========== NOVEMBER 2025 INTAKE DATA ==========
  
  // Create additional trainee users for November intake with famous singer/rapper names (all with first and last names)
  const novTraineeNames = [
    'Snoop Dogg',
    'Taylor Swift',
    'Doja Cat',
    'Kendrick Lamar',
    'Ariana Grande',
    'Marshall Mathers', // Eminem (replaces Drake)
    'Billie Eilish',
    'Bruno Mars', // Replaces The Weeknd
    'Beyoncé Knowles', // Replaces Beyonce
    'Post Malone',
  ];

  const novTrainees = [];
  for (const name of novTraineeNames) {
    // Create username from full name (lowercase, no spaces, but keep the full name)
    // Username will be like "snoopdogg", "taylorswift", etc.
    const username = name.toLowerCase().replace(/\s+/g, '');
    const password = await bcrypt.hash('trainee123', 10);
    const trainee = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        password,
        role: 'TRAINEE',
      },
    });
    // Store the full name with the trainee object for reference
    novTrainees.push({ ...trainee, fullName: name });
  }

  // Create November 2025 intake
  const novIntake = await prisma.intake.create({
    data: {
      name: 'November 2025 Intake',
      description: 'November training program for new employees - 10 trainees with progressive skill development',
      createdBy: manager.id,
    },
  });

  // Add trainees to November intake
  await prisma.intakeMember.createMany({
    data: novTrainees.map((t) => ({
      intakeId: novIntake.id,
      userId: t.id,
    })),
  });

  // Create skill groups for November intake
  const novPreparationGroup = await prisma.skillGroup.create({
    data: {
      intakeId: novIntake.id,
      name: 'Preparation',
      description: 'Pre-shift preparation and readiness',
    },
  });

  const novCustomerServiceGroup = await prisma.skillGroup.create({
    data: {
      intakeId: novIntake.id,
      name: 'Customer Service',
      description: 'Customer interaction and service skills',
    },
  });

  const novComprehensionGroup = await prisma.skillGroup.create({
    data: {
      intakeId: novIntake.id,
      name: 'Comprehension',
      description: 'Understanding and application of learned material',
    },
  });

  const novSystemsTechnicalGroup = await prisma.skillGroup.create({
    data: {
      intakeId: novIntake.id,
      name: 'Systems Technical Ability',
      description: 'Technical systems navigation and usage',
    },
  });

  // Create skills for November intake - Preparation group
  const novPunctualitySkill = await prisma.skill.create({
    data: {
      skillGroupId: novPreparationGroup.id,
      name: 'Punctuality',
      description: 'Is at work & logged into systems prior to rostered start time',
    },
  });

  const novAppOpenSkill = await prisma.skill.create({
    data: {
      skillGroupId: novPreparationGroup.id,
      name: 'Has the appropriate applications open',
      description: 'Has the appropriate applications open eg CMS, HIYA, STP, Notepad etc',
    },
  });

  const novRightPlaceSkill = await prisma.skill.create({
    data: {
      skillGroupId: novPreparationGroup.id,
      name: 'Right time Right place',
      description: 'Adherence to roster',
    },
  });

  // Customer Service group
  const novGreetSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Greet and Identify clients',
      description: 'Greet and Identify clients as per current guidelines',
    },
  });

  const novClientNeedSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Uses client "Need" when presented via VET',
      description: 'Uses client "Need" when presented via VET',
    },
  });

  const novClientNameSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Uses clients name appropriately',
      description: 'Uses clients name appropriately',
    },
  });

  const novSpeakClearSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Speaks Clearly/Sounds Confident',
      description: 'Speaks Clearly/Sounds Confident',
    },
  });

  const novQuestionsSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Asks appropriate open/closed questions',
      description: 'Asks appropriate open/closed questions',
    },
  });

  const novCallFlowSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Shows good call flow/control',
      description: 'Shows good call flow/control',
    },
  });

  const novHoldSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Does not use "Hold" unnecessarily',
      description: 'Does not use "Hold" unnecessarily',
    },
  });

  const novSummariseSkill = await prisma.skill.create({
    data: {
      skillGroupId: novCustomerServiceGroup.id,
      name: 'Summarises call during closing & ends call in a positive way',
      description: 'Summarises call during closing & ends call in a positive way',
    },
  });

  // Comprehension group
  const novUnderstandSkill = await prisma.skill.create({
    data: {
      skillGroupId: novComprehensionGroup.id,
      name: 'Able to understand and apply material learned',
      description: 'Able to understand and apply material learned',
    },
  });

  const novDecisionsSkill = await prisma.skill.create({
    data: {
      skillGroupId: novComprehensionGroup.id,
      name: 'Able to make decisions & take the appropriate action/s independently',
      description: 'Able to make decisions & take the appropriate action/s independently',
    },
  });

  // Systems Technical Ability group
  const novNavigationSkill = await prisma.skill.create({
    data: {
      skillGroupId: novSystemsTechnicalGroup.id,
      name: 'Efficient navigation of appropriate computer systems',
      description: 'Efficient navigation of appropriate computer systems eg CMS, ABT, HIYA etc',
    },
  });

  const novLocateInfoSkill = await prisma.skill.create({
    data: {
      skillGroupId: novSystemsTechnicalGroup.id,
      name: 'Uses the appropriate systems to locate information',
      description: 'Uses the appropriate systems to locate information eg MAP, HIYA, CMS',
    },
  });

  const novGuidelinesSkill = await prisma.skill.create({
    data: {
      skillGroupId: novSystemsTechnicalGroup.id,
      name: 'Uses Contact Centre Guidelines regularly',
      description: 'Uses Contact Centre Guidelines regularly',
    },
  });

  const novMustViewSkill = await prisma.skill.create({
    data: {
      skillGroupId: novSystemsTechnicalGroup.id,
      name: 'Checks Must View Notes and Special Cautions every time',
      description: 'Checks Must View Notes and Special Cautions every time',
    },
  });

  // Create training sessions showing gradual skill improvement
  // Session dates: Nov 1, Nov 4, Nov 7, Nov 11, Nov 14, Nov 18, Nov 21, Nov 25, Nov 28
  const sessionDates = [
    new Date('2025-11-01'),
    new Date('2025-11-04'),
    new Date('2025-11-07'),
    new Date('2025-11-11'),
    new Date('2025-11-14'),
    new Date('2025-11-18'),
    new Date('2025-11-21'),
    new Date('2025-11-25'),
    new Date('2025-11-28'),
  ];

  // Map all skills for easy reference
  const skills = {
    // Preparation group
    punctuality: novPunctualitySkill.id,
    appOpen: novAppOpenSkill.id,
    rightPlace: novRightPlaceSkill.id,
    // Customer Service group
    greet: novGreetSkill.id,
    clientNeed: novClientNeedSkill.id,
    clientName: novClientNameSkill.id,
    speakClear: novSpeakClearSkill.id,
    questions: novQuestionsSkill.id,
    callFlow: novCallFlowSkill.id,
    hold: novHoldSkill.id,
    summarise: novSummariseSkill.id,
    // Comprehension group
    understand: novUnderstandSkill.id,
    decisions: novDecisionsSkill.id,
    // Systems Technical Ability group
    navigation: novNavigationSkill.id,
    locateInfo: novLocateInfoSkill.id,
    guidelines: novGuidelinesSkill.id,
    mustView: novMustViewSkill.id,
  };

  // Base starting scores for each trainee (varying starting points)
  // Using a simplified scoring system where each skill starts between 4-7
  const baseScores: { [key: string]: { [skill: string]: number } } = {
    snoopdogg: { 
      punctuality: 6, appOpen: 5, rightPlace: 5,
      greet: 7, clientNeed: 6, clientName: 6, speakClear: 7, questions: 6, callFlow: 7, hold: 7, summarise: 6,
      understand: 6, decisions: 7,
      navigation: 5, locateInfo: 5, guidelines: 6, mustView: 6,
    },
    taylorswift: { 
      punctuality: 7, appOpen: 6, rightPlace: 6,
      greet: 9, clientNeed: 8, clientName: 8, speakClear: 9, questions: 8, callFlow: 8, hold: 8, summarise: 8,
      understand: 7, decisions: 8,
      navigation: 6, locateInfo: 6, guidelines: 7, mustView: 7,
    },
    dojacat: { 
      punctuality: 5, appOpen: 5, rightPlace: 4,
      greet: 7, clientNeed: 6, clientName: 6, speakClear: 7, questions: 6, callFlow: 6, hold: 6, summarise: 6,
      understand: 5, decisions: 6,
      navigation: 4, locateInfo: 4, guidelines: 5, mustView: 5,
    },
    kendricklamar: { 
      punctuality: 6, appOpen: 5, rightPlace: 4,
      greet: 8, clientNeed: 7, clientName: 7, speakClear: 8, questions: 7, callFlow: 7, hold: 7, summarise: 7,
      understand: 6, decisions: 7,
      navigation: 4, locateInfo: 5, guidelines: 6, mustView: 6,
    },
    arianagrande: { 
      punctuality: 7, appOpen: 6, rightPlace: 5,
      greet: 9, clientNeed: 8, clientName: 8, speakClear: 9, questions: 8, callFlow: 8, hold: 8, summarise: 8,
      understand: 7, decisions: 8,
      navigation: 5, locateInfo: 6, guidelines: 7, mustView: 7,
    },
    marshallmathers: { 
      punctuality: 6, appOpen: 5, rightPlace: 4,
      greet: 7, clientNeed: 6, clientName: 6, speakClear: 7, questions: 7, callFlow: 7, hold: 7, summarise: 6,
      understand: 6, decisions: 7,
      navigation: 4, locateInfo: 5, guidelines: 6, mustView: 6,
    },
    billieeilish: { 
      punctuality: 5, appOpen: 4, rightPlace: 3,
      greet: 7, clientNeed: 6, clientName: 6, speakClear: 7, questions: 5, callFlow: 5, hold: 6, summarise: 5,
      understand: 5, decisions: 6,
      navigation: 3, locateInfo: 4, guidelines: 5, mustView: 5,
    },
    brunomars: { 
      punctuality: 6, appOpen: 5, rightPlace: 4,
      greet: 7, clientNeed: 6, clientName: 6, speakClear: 7, questions: 7, callFlow: 6, hold: 7, summarise: 6,
      understand: 6, decisions: 7,
      navigation: 4, locateInfo: 5, guidelines: 6, mustView: 6,
    },
    beyoncéknowles: { 
      punctuality: 7, appOpen: 6, rightPlace: 5,
      greet: 9, clientNeed: 8, clientName: 8, speakClear: 9, questions: 8, callFlow: 8, hold: 8, summarise: 8,
      understand: 7, decisions: 8,
      navigation: 5, locateInfo: 6, guidelines: 7, mustView: 7,
    },
    postmalone: { 
      punctuality: 5, appOpen: 4, rightPlace: 3,
      greet: 6, clientNeed: 5, clientName: 5, speakClear: 6, questions: 5, callFlow: 5, hold: 6, summarise: 5,
      understand: 5, decisions: 6,
      navigation: 3, locateInfo: 4, guidelines: 5, mustView: 5,
    },
  };

  // Create sessions for each trainee with gradual improvement
  for (let i = 0; i < novTrainees.length; i++) {
    const trainee = novTrainees[i];
    const username = trainee.username;
    const baseScore = baseScores[username] || baseScores['snoopdogg'];
    
    for (let sessionIndex = 0; sessionIndex < sessionDates.length; sessionIndex++) {
      const sessionDate = sessionDates[sessionIndex];
      
      // Calculate scores with gradual improvement (not linear, some variation)
      // Improvement varies by skill and session
      const getScore = (skillName: string, base: number) => {
        // Each session shows some improvement (0.3 to 1.2 points)
        const improvement = (sessionIndex * 0.5) + (Math.random() * 0.7 - 0.35);
        // Some skills improve faster than others
        const skillMultiplier = skillName.includes('nav') || skillName.includes('locate') ? 0.9 : skillName.includes('punctuality') || skillName.includes('appOpen') ? 1.1 : 1.0;
        let newScore = base + (improvement * skillMultiplier);
        
        // Add some randomness to make it more realistic
        newScore += (Math.random() * 0.6 - 0.3);
        
        // Cap at 10
        newScore = Math.min(10, Math.max(0, newScore));
        return Math.round(newScore * 10) / 10; // Round to 1 decimal
      };

      // Calculate scores for all skills
      const punctualityScore = Math.round(getScore('punctuality', baseScore.punctuality));
      const appOpenScore = Math.round(getScore('appOpen', baseScore.appOpen));
      const rightPlaceScore = Math.round(getScore('rightPlace', baseScore.rightPlace));
      const greetScore = Math.round(getScore('greet', baseScore.greet));
      const clientNeedScore = Math.round(getScore('clientNeed', baseScore.clientNeed));
      const clientNameScore = Math.round(getScore('clientName', baseScore.clientName));
      const speakClearScore = Math.round(getScore('speakClear', baseScore.speakClear));
      const questionsScore = Math.round(getScore('questions', baseScore.questions));
      const callFlowScore = Math.round(getScore('callFlow', baseScore.callFlow));
      const holdScore = Math.round(getScore('hold', baseScore.hold));
      const summariseScore = Math.round(getScore('summarise', baseScore.summarise));
      const understandScore = Math.round(getScore('understand', baseScore.understand));
      const decisionsScore = Math.round(getScore('decisions', baseScore.decisions));
      const navigationScore = Math.round(getScore('navigation', baseScore.navigation));
      const locateInfoScore = Math.round(getScore('locateInfo', baseScore.locateInfo));
      const guidelinesScore = Math.round(getScore('guidelines', baseScore.guidelines));
      const mustViewScore = Math.round(getScore('mustView', baseScore.mustView));

      // Create comments based on progress
      const allScores = [
        punctualityScore, appOpenScore, rightPlaceScore,
        greetScore, clientNeedScore, clientNameScore, speakClearScore, questionsScore, callFlowScore, holdScore, summariseScore,
        understandScore, decisionsScore,
        navigationScore, locateInfoScore, guidelinesScore, mustViewScore,
      ];
      const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
      let comments = '';
      if (sessionIndex === 0) {
        comments = `Initial assessment. Good starting point.`;
      } else if (avgScore >= 8) {
        comments = `Excellent progress! Showing strong competency across all areas.`;
      } else if (avgScore >= 6) {
        comments = `Steady improvement. Keep up the good work.`;
      } else {
        comments = `Making progress. Continue practicing.`;
      }

      await prisma.trainingSession.create({
        data: {
          intakeId: novIntake.id,
          traineeId: trainee.id,
          trainerId: trainer.id,
          sessionDate,
          comments,
          skillRatings: {
            create: [
              // Preparation group
              { skillId: skills.punctuality, score: punctualityScore },
              { skillId: skills.appOpen, score: appOpenScore },
              { skillId: skills.rightPlace, score: rightPlaceScore },
              // Customer Service group
              { skillId: skills.greet, score: greetScore },
              { skillId: skills.clientNeed, score: clientNeedScore },
              { skillId: skills.clientName, score: clientNameScore },
              { skillId: skills.speakClear, score: speakClearScore },
              { skillId: skills.questions, score: questionsScore },
              { skillId: skills.callFlow, score: callFlowScore },
              { skillId: skills.hold, score: holdScore },
              { skillId: skills.summarise, score: summariseScore },
              // Comprehension group
              { skillId: skills.understand, score: understandScore },
              { skillId: skills.decisions, score: decisionsScore },
              // Systems Technical Ability group
              { skillId: skills.navigation, score: navigationScore },
              { skillId: skills.locateInfo, score: locateInfoScore },
              { skillId: skills.guidelines, score: guidelinesScore },
              { skillId: skills.mustView, score: mustViewScore },
            ],
          },
        },
      });
    }
  }

  console.log('Seed data created successfully!');
  console.log('\nUser Credentials:');
  console.log('Admin: admin / admin123');
  console.log('Manager: manager / manager123');
  console.log('Trainer: trainer / trainer123');
  console.log('\nNovember 2025 Intake created with:');
  console.log('- 10 trainees with famous singer/rapper names (all with first and last names):');
  console.log('  * Snoop Dogg, Taylor Swift, Doja Cat, Kendrick Lamar,');
  console.log('    Ariana Grande, Marshall Mathers (Eminem), Billie Eilish, Bruno Mars,');
  console.log('    Beyoncé Knowles, Post Malone');
  console.log('- All celebrity trainees password: trainee123');
  console.log('- 4 skill groups:');
  console.log('  * Preparation (3 skills)');
  console.log('  * Customer Service (8 skills)');
  console.log('  * Comprehension (2 skills)');
  console.log('  * Systems Technical Ability (4 skills)');
  console.log('- Total: 17 skills');
  console.log('- 90 training sessions (9 sessions per trainee) showing gradual skill improvement');
  console.log('\nSpring 2024 and February 2025 intakes have been removed.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

