import express from 'express';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Export trainee data to Excel
router.get('/trainee/:traineeId/excel', async (req: AuthRequest, res) => {
  try {
    const { traineeId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER' && req.user!.role !== 'TRAINER') {
      if (req.user!.id !== traineeId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build where clause
    const where: any = { traineeId };
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate as string);
      if (endDate) where.sessionDate.lte = new Date(endDate as string);
    }

    // Get sessions
    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        intake: {
          select: {
            id: true,
            name: true,
          },
        },
        trainer: {
          select: {
            username: true,
          },
        },
        skillRatings: {
          include: {
            skill: {
              include: {
                skillGroup: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        dailySummary: true,
      },
      orderBy: { sessionDate: 'asc' },
    });

    // Get all skills for this trainee's intakes
    const intakeIds = [...new Set(sessions.map((s) => s.intakeId))];
    const skillGroups = await prisma.skillGroup.findMany({
      where: {
        intakeId: { in: intakeIds },
      },
      include: {
        skills: true,
      },
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Trainee:', user.username],
      ['Export Date:', new Date().toLocaleDateString()],
      ['Total Sessions:', sessions.length],
      [''],
    ];

    // Skills progress sheet - collect all ratings first, then sort by skill group
    const allRatings: Array<{
      date: Date;
      skillGroup: string;
      skill: string;
      score: number;
      comments: string;
      sessionDate: Date;
    }> = [];

    // Sessions sheet
    const sessionsSheetData: any[] = [
      ['Date', 'Intake', 'Trainer', 'Total Skills', 'Average Score', 'Comments', 'Summary'],
    ];

    // Process sessions
    for (const session of sessions) {
      const ratings = session.skillRatings;
      const avgScore = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(2)
        : 'N/A';

      sessionsSheetData.push([
        session.sessionDate.toLocaleDateString(),
        session.intake.name,
        session.trainer.username,
        ratings.length,
        avgScore,
        session.comments || '',
        session.dailySummary ? 'Yes' : 'No',
      ]);

      // Collect skill ratings for sorting
      for (const rating of ratings) {
        allRatings.push({
          date: session.sessionDate,
          skillGroup: rating.skill.skillGroup.name,
          skill: rating.skill.name,
          score: rating.score,
          comments: rating.comments || '',
          sessionDate: session.sessionDate,
        });
      }
    }

    // Sort ratings by skill group, then by skill name, then by date
    allRatings.sort((a, b) => {
      if (a.skillGroup !== b.skillGroup) {
        return a.skillGroup.localeCompare(b.skillGroup);
      }
      if (a.skill !== b.skill) {
        return a.skill.localeCompare(b.skill);
      }
      return a.sessionDate.getTime() - b.sessionDate.getTime();
    });

    // Build skills sheet data with grouping
    const skillsSheetData: any[] = [
      ['Date', 'Skill Group', 'Skill', 'Score', 'Comments'],
    ];

    // Group by skill group for visual separation
    let currentSkillGroup = '';
    for (const rating of allRatings) {
      // Add a blank row when skill group changes (except for first group)
      if (currentSkillGroup && currentSkillGroup !== rating.skillGroup) {
        skillsSheetData.push(['', '', '', '', '']);
      }
      currentSkillGroup = rating.skillGroup;

      skillsSheetData.push([
        rating.date.toLocaleDateString(),
        rating.skillGroup,
        rating.skill,
        rating.score,
        rating.comments,
      ]);
    }

    // Create sheets
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    const skillsSheet = XLSX.utils.aoa_to_sheet(skillsSheetData);
    const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsSheetData);

    // Add color coding to skills sheet based on score
    // Score column is column D (index 3)
    const skillsRange = XLSX.utils.decode_range(skillsSheet['!ref'] || 'A1');
    for (let row = 1; row <= skillsRange.e.r; row++) {
      const scoreCell = XLSX.utils.encode_cell({ r: row, c: 3 }); // Score column (D)
      if (skillsSheet[scoreCell] && typeof skillsSheet[scoreCell].v === 'number') {
        const score = skillsSheet[scoreCell].v;
        
        // Initialize style if not exists
        if (!skillsSheet[scoreCell].s) {
          skillsSheet[scoreCell].s = {};
        }

        // Color code based on score ranges
        if (score >= 9) {
          // Excellent (9-10): Dark green
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: '059669' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: 'FFFFFF' }, bold: true };
        } else if (score >= 8) {
          // Good (8-8.9): Light green
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: '10b981' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: 'FFFFFF' } };
        } else if (score >= 7) {
          // Above average (7-7.9): Light green-yellow
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: '84cc16' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: '000000' } };
        } else if (score >= 6) {
          // Average (6-6.9): Yellow
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: 'eab308' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: '000000' } };
        } else if (score >= 5) {
          // Below average (5-5.9): Orange
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: 'f59e0b' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: 'FFFFFF' } };
        } else if (score >= 3) {
          // Poor (3-4.9): Light red
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: 'f97316' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: 'FFFFFF' } };
        } else {
          // Very poor (0-2.9): Dark red
          skillsSheet[scoreCell].s.fill = { fgColor: { rgb: 'ef4444' } };
          skillsSheet[scoreCell].s.font = { color: { rgb: 'FFFFFF' }, bold: true };
        }
      }
    }

    // Set column widths
    skillsSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Skill Group
      { wch: 30 }, // Skill
      { wch: 8 },  // Score
      { wch: 40 }, // Comments
    ];

    sessionsSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Intake
      { wch: 20 }, // Trainer
      { wch: 12 }, // Total Skills
      { wch: 12 }, // Average Score
      { wch: 40 }, // Comments
      { wch: 10 }, // Summary
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, skillsSheet, 'Skills Progress');
    XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sessions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=trainee-${user.username}-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export trainee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export intake data to Excel
router.get('/intake/:intakeId/excel', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { intakeId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access
    const intake = await prisma.intake.findUnique({
      where: { id: intakeId },
    });

    if (!intake) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    if (req.user!.role === 'MANAGER' && intake.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get intake members
    const members = await prisma.intakeMember.findMany({
      where: { intakeId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Build where clause
    const where: any = { intakeId };
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate as string);
      if (endDate) where.sessionDate.lte = new Date(endDate as string);
    }

    // Get sessions
    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        trainee: {
          select: {
            id: true,
            username: true,
          },
        },
        trainer: {
          select: {
            username: true,
          },
        },
        skillRatings: {
          include: {
            skill: {
              include: {
                skillGroup: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Overview sheet
    const overviewData: any[] = [
      ['Intake:', intake.name],
      ['Export Date:', new Date().toLocaleDateString()],
      ['Total Trainees:', members.length],
      ['Total Sessions:', sessions.length],
      [''],
      ['Trainee', 'Sessions', 'Average Score', 'Last Session'],
    ];

    // Calculate trainee statistics
    const traineeStats = new Map<string, { sessions: number; totalScore: number; count: number; lastSession: Date | null }>();

    for (const session of sessions) {
      const traineeId = session.traineeId;
      if (!traineeStats.has(traineeId)) {
        traineeStats.set(traineeId, { sessions: 0, totalScore: 0, count: 0, lastSession: null });
      }

      const stats = traineeStats.get(traineeId)!;
      stats.sessions++;
      if (session.skillRatings.length > 0) {
        const avg = session.skillRatings.reduce((sum, r) => sum + r.score, 0) / session.skillRatings.length;
        stats.totalScore += avg;
        stats.count++;
      }
      if (!stats.lastSession || session.sessionDate > stats.lastSession) {
        stats.lastSession = session.sessionDate;
      }
    }

    for (const member of members) {
      const stats = traineeStats.get(member.user.id) || { sessions: 0, totalScore: 0, count: 0, lastSession: null };
      const avgScore = stats.count > 0 ? (stats.totalScore / stats.count).toFixed(2) : 'N/A';
      overviewData.push([
        member.user.username,
        stats.sessions,
        avgScore,
        stats.lastSession ? stats.lastSession.toLocaleDateString() : 'N/A',
      ]);
    }

    // Sessions sheet
    const sessionsSheetData: any[] = [
      ['Date', 'Trainee', 'Trainer', 'Skills Rated', 'Average Score', 'Comments'],
    ];

    for (const session of sessions) {
      const avgScore = session.skillRatings.length > 0
        ? (session.skillRatings.reduce((sum, r) => sum + r.score, 0) / session.skillRatings.length).toFixed(2)
        : 'N/A';

      sessionsSheetData.push([
        session.sessionDate.toLocaleDateString(),
        session.trainee.username,
        session.trainer.username,
        session.skillRatings.length,
        avgScore,
        session.comments || '',
      ]);
    }

    // Create sheets
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsSheetData);

    // Set column widths
    overviewSheet['!cols'] = [
      { wch: 20 }, // Trainee
      { wch: 10 }, // Sessions
      { wch: 12 }, // Average Score
      { wch: 12 }, // Last Session
    ];

    sessionsSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Trainee
      { wch: 20 }, // Trainer
      { wch: 12 }, // Skills Rated
      { wch: 12 }, // Average Score
      { wch: 40 }, // Comments
    ];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sessions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=intake-${intake.name}-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export intake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export daily summary to PDF
router.get('/summary/:sessionId/pdf', async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  console.log('PDF export request for session:', sessionId);
  
  try {

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        trainee: {
          select: {
            username: true,
          },
        },
        trainer: {
          select: {
            username: true,
          },
        },
        intake: {
          select: {
            name: true,
          },
        },
        skillRatings: {
          include: {
            skill: {
              include: {
                skillGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        dailySummary: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check access
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER' && req.user!.role !== 'TRAINER') {
      if (req.user!.id !== session.traineeId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Helper function to format date as dd/mm/yyyy
    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Helper function to get Monday of the week for a given date
    const getMondayOfWeek = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      // Calculate days to subtract to get to Monday (0 = Sunday, 1 = Monday, etc.)
      const daysToSubtract = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - daysToSubtract);
      d.setHours(0, 0, 0, 0); // Reset to midnight
      return d;
    };

    // Get Monday of the week for session date
    // Ensure sessionDate is a Date object
    let sessionDateObj: Date;
    try {
      if (!session.sessionDate) {
        throw new Error('Session date is missing');
      }
      sessionDateObj = session.sessionDate instanceof Date 
        ? session.sessionDate 
        : new Date(session.sessionDate);
      
      if (isNaN(sessionDateObj.getTime())) {
        throw new Error('Invalid session date');
      }
    } catch (err: any) {
      console.error('Date processing error:', err);
      return res.status(400).json({ error: 'Invalid session date', details: err?.message });
    }
    
    const mondayOfWeek = getMondayOfWeek(sessionDateObj);
    const weekBeginning = formatDate(mondayOfWeek);

    // Group skill ratings by skill group
    console.log('Grouping skill ratings...');
    const skillRatingsByGroup = new Map<string, any[]>();
    if (session.skillRatings && session.skillRatings.length > 0) {
      session.skillRatings.forEach((rating: any) => {
        // Check if skill and skillGroup exist
        if (rating.skill && rating.skill.skillGroup && rating.skill.skillGroup.name) {
          const groupName = rating.skill.skillGroup.name;
          if (!skillRatingsByGroup.has(groupName)) {
            skillRatingsByGroup.set(groupName, []);
          }
          skillRatingsByGroup.get(groupName)!.push(rating);
        }
      });
    }

    // Sort skill groups alphabetically
    const sortedSkillGroups = Array.from(skillRatingsByGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
    console.log('Skill groups:', sortedSkillGroups.length);

    // Create PDF first (before setting headers to catch early errors)
    console.log('Creating PDFDocument...');
    let doc: InstanceType<typeof PDFDocument>;
    try {
      doc = new PDFDocument({ margin: 50 });
    } catch (err: any) {
      console.error('Failed to create PDFDocument:', err);
      return res.status(500).json({ error: 'Failed to create PDF', details: err?.message });
    }

    // Get page dimensions
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    const bottomMargin = 50;
    const topMargin = 50;
    const maxY = pageHeight - bottomMargin;

    // Handle PDF stream errors
    doc.on('error', (err: any) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation error', details: err?.message });
      } else {
        res.end(); // End response if headers already sent
      }
    });

    // Helper function to add page numbers to all pages (called at the end)
    const addPageNumbers = () => {
      try {
        const pageRange = doc.bufferedPageRange();
        if (pageRange && pageRange.count > 0) {
          for (let i = pageRange.start; i <= pageRange.start + pageRange.count; i++) {
            doc.switchToPage(i);
            const bottom = pageHeight - 30;
            const savedY = doc.y;
            doc.fontSize(10).fillColor('#000000');
            doc.text(`Page ${i + 1}`, pageWidth / 2, bottom, { align: 'center', width: pageWidth });
            doc.y = savedY;
          }
          // Switch back to last page
          doc.switchToPage(pageRange.start + pageRange.count);
        }
      } catch (err) {
        console.error('Error adding page numbers:', err);
      }
    };

    // Set response headers BEFORE piping
    console.log('Setting response headers...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=summary-${sessionId}.pdf`);

    // Pipe PDF to response
    console.log('Piping PDF to response...');
    doc.pipe(res);

    // Generate PDF content (wrapped in try-catch to catch errors during generation)
    console.log('Writing PDF content...');
    try {
      // Title
      doc.fontSize(20).fillColor('#0066cc').text('Trainee Evaluation Form', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text('Your feedback is important as it helps us to support the continuous improvement of our trainees.', { align: 'center' });
      doc.moveDown(1);

      // Trainee Information Box
      const boxY = doc.y;
      doc.rect(50, boxY, 500, 60).stroke();
      const traineeName = session.trainee?.username || 'Unknown';
      const trainerName = session.trainer?.username || 'Unknown';
      doc.fontSize(12).text(`Trainee: ${traineeName}`, 60, boxY + 10);
      doc.text(`Buddy: ${trainerName}`, 60, boxY + 28);
      doc.text(`Week Beginning: ${weekBeginning}`, 60, boxY + 46);
      doc.y = boxY + 70;

      doc.moveDown(1);

      // Skills Table Section
      doc.fontSize(12).fillColor('#0066cc').text('Your Feedback', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000000').text('Please indicate the level of understanding your trainee has for the following:', { align: 'left' });
      doc.moveDown(0.8);

      // Process each skill group (only if we have skill ratings)
      if (sortedSkillGroups.length === 0) {
        doc.fontSize(10).fillColor('#000000').text('No skill ratings available for this session.', { align: 'left' });
        doc.moveDown(1);
      } else {
        sortedSkillGroups.forEach(([groupName, ratings]) => {
          // Check if we need a new page before starting the skill group
          // Estimate space needed: top spacing (10) + title (18) + gap (5) + header (25) + at least 3 rows (75) = ~133
          const estimatedSpaceNeeded = 133;
          // Only add a new page if we're close to the bottom AND don't have enough space
          // Be conservative - only add page if we're within 50px of the bottom
          if (doc.y > maxY - 50 && doc.y + estimatedSpaceNeeded > maxY) {
            doc.addPage();
            doc.y = topMargin; // Reset to top after new page
          }

          // Add slight top spacing above skill group heading
          doc.y += 10;

          // Skill Group Title - always at left margin (50)
          doc.fontSize(12).fillColor('#0066cc');
          doc.text(groupName, 50, doc.y, { width: 500, align: 'left' });
          doc.y += 18; // Move down after title (reduced from 20)
          // Reduced spacing underneath - just a small gap before table
          doc.y += 5;

          // Table setup - simpler layout with just skill name and score
          const tableLeft = 50;
          const tableWidth = 500;
          const skillColWidth = tableWidth * 0.75; // 75% for skill name
          const scoreColWidth = tableWidth * 0.25; // 25% for score
          const rowHeight = 25;
          const headerHeight = 25;

          // Table headers
          const startY = doc.y;
          doc.fontSize(9).fillColor('#000000');
          
          // Skill name column header
          doc.rect(tableLeft, startY, skillColWidth, headerHeight).stroke();
          doc.text('Skill', tableLeft + 5, startY + 8, { width: skillColWidth - 10, align: 'left' });
          
          // Score column header
          const scoreColX = tableLeft + skillColWidth;
          doc.rect(scoreColX, startY, scoreColWidth, headerHeight).stroke();
          doc.text('Score', scoreColX + 5, startY + 8, { width: scoreColWidth - 10, align: 'center' });

          doc.y = startY + headerHeight;

          // Sort ratings by skill name (with null checks)
          const sortedRatings = [...ratings].sort((a, b) => {
            const nameA = a.skill?.name || '';
            const nameB = b.skill?.name || '';
            return nameA.localeCompare(nameB);
          });

          // Table rows for each skill
          sortedRatings.forEach((rating) => {
            // Skip if skill data is missing
            if (!rating.skill || !rating.skill.name) {
              console.warn('Skipping rating with missing skill data:', rating);
              return;
            }

            // Check if we need a new page - leave room for the row
            // Only add page if we're very close to the bottom (within 10px)
            if (doc.y > maxY - rowHeight - 10) {
              doc.addPage();
              doc.y = topMargin; // Reset to top after new page
              // Redraw skill group title and headers on new page
              doc.y += 10; // Top spacing
              doc.fontSize(12).fillColor('#0066cc');
              doc.text(groupName, 50, doc.y, { width: 500, align: 'left' });
              doc.y += 18;
              doc.y += 5;
              
              const newStartY = doc.y;
              doc.fontSize(9).fillColor('#000000');
              doc.rect(tableLeft, newStartY, skillColWidth, headerHeight).stroke();
              doc.text('Skill', tableLeft + 5, newStartY + 8, { width: skillColWidth - 10, align: 'left' });
              doc.rect(scoreColX, newStartY, scoreColWidth, headerHeight).stroke();
              doc.text('Score', scoreColX + 5, newStartY + 8, { width: scoreColWidth - 10, align: 'center' });
              doc.y = newStartY + headerHeight;
            }

            const rowY = doc.y;
            const score = rating.score || 0;

            // Skill name column
            doc.rect(tableLeft, rowY, skillColWidth, rowHeight).stroke();
            doc.fontSize(9).text(rating.skill.name, tableLeft + 5, rowY + 8, { 
              width: skillColWidth - 10, 
              align: 'left',
              ellipsis: true 
            });

            // Score column - show actual score (e.g., "9/10")
            doc.rect(scoreColX, rowY, scoreColWidth, rowHeight).stroke();
            doc.fontSize(9).text(`${score}/10`, scoreColX + 5, rowY + 8, { 
              width: scoreColWidth - 10, 
              align: 'center' 
            });

            doc.y = rowY + rowHeight;
          });

          // Reduced spacing after skill group table
          doc.y += 5;
        });
      }

      // Summary Section
      if (session.dailySummary && session.dailySummary.content) {
        // Check if we need a new page for summary
        // Leave space for title (20) and some content (50) = ~70
        // Only add page if we're very close to the bottom (within 50px) AND don't have enough space
        if (doc.y > maxY - 50 && doc.y + 70 > maxY) {
          doc.addPage();
          doc.y = topMargin;
        } else {
          doc.moveDown(1);
        }
        
        // Summary Title - always at left margin
        doc.fontSize(12).fillColor('#0066cc');
        doc.text('Summary', 50, doc.y, { width: 500, align: 'left' });
        doc.y += 20;
        doc.moveDown(0.5);

        // Parse HTML and convert to formatted text
        const htmlContent = session.dailySummary.content;
        
        // Helper function to parse HTML and format for PDF
        const parseHtmlToText = (html: string): string[] => {
          // Remove script and style tags
          html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          
          // Process ordered lists - replace with numbered items
          html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, listContent) => {
            let counter = 1;
            const formatted = listContent.replace(/<li[^>]*>(.*?)<\/li>/gi, (_liMatch: string, liContent: string) => {
              // Remove nested tags from list item content first
              let text = liContent.replace(/<[^>]*>/g, '');
              text = text.replace(/&nbsp;/g, ' ').trim();
              const numbered = `${counter}. ${text}`;
              counter++;
              return numbered + '\n';
            });
            return formatted;
          });
          
          // Process unordered lists - replace with bullet points
          html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, listContent) => {
            return listContent.replace(/<li[^>]*>(.*?)<\/li>/gi, (_liMatch: string, liContent: string) => {
              // Remove nested tags from list item content first
              let text = liContent.replace(/<[^>]*>/g, '');
              text = text.replace(/&nbsp;/g, ' ').trim();
              return `• ${text}\n`;
            });
          });
          
          // Convert block elements to line breaks
          html = html.replace(/<br\s*\/?>/gi, '\n');
          html = html.replace(/<\/p>/gi, '\n\n');
          html = html.replace(/<p[^>]*>/gi, '');
          html = html.replace(/<\/div>/gi, '\n');
          html = html.replace(/<div[^>]*>/gi, '');
          html = html.replace(/<\/h[1-6]>/gi, '\n\n');
          html = html.replace(/<h[1-6][^>]*>/gi, '');
          
          // Remove remaining HTML tags
          html = html.replace(/<[^>]*>/g, '');
          
          // Decode HTML entities
          html = html.replace(/&nbsp;/g, ' ');
          html = html.replace(/&amp;/g, '&');
          html = html.replace(/&lt;/g, '<');
          html = html.replace(/&gt;/g, '>');
          html = html.replace(/&quot;/g, '"');
          html = html.replace(/&#39;/g, "'");
          html = html.replace(/&apos;/g, "'");
          
          // Split into lines, clean up, and preserve bullet points
          const parsedLines = html
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          return parsedLines;
        };
        
        const textLines = parseHtmlToText(htmlContent);
        
        // Write formatted text to PDF
        doc.fontSize(10).fillColor('#000000');
        // Filter out empty lines first to know how many lines we actually have
        const nonEmptyLines = textLines.filter(line => line.trim().length > 0);
        let lineIndex = 0;
        
        nonEmptyLines.forEach((line) => {
          // Check if we need a new page - leave some margin
          // Only add page if we're very close to the bottom (within 30px)
          // AND we have more content to write
          if (doc.y > maxY - 30 && lineIndex < nonEmptyLines.length - 1) {
            // Only add page if there's more content coming
            doc.addPage();
            doc.y = topMargin;
          }
          
          // Always start from left margin (50) for consistent alignment
          doc.text(line, 50, doc.y, { width: 500, align: 'left' });
          doc.y += 15; // Move down after each line
          lineIndex++;
        });
      }

      // Check if the last page is empty (Y is at or very close to top margin)
      // PDFKit doesn't allow removing pages, but we can detect and skip numbering empty pages
      const pageRange = doc.bufferedPageRange();
      const currentY = doc.y;
      const isLastPageEmpty = currentY <= topMargin + 30;
      
      if (pageRange && pageRange.count > 0 && isLastPageEmpty) {
        // Last page appears to be empty, only add page numbers to pages with content
        const lastPageIndex = pageRange.start + pageRange.count;
        // Add page numbers to all pages except the last (empty) one
        for (let i = pageRange.start; i < lastPageIndex; i++) {
          doc.switchToPage(i);
          const bottom = pageHeight - 30;
          const savedY = doc.y;
          doc.fontSize(10).fillColor('#000000');
          doc.text(`Page ${i + 1}`, pageWidth / 2, bottom, { align: 'center', width: pageWidth });
          doc.y = savedY;
        }
        // Switch back to the last non-empty page
        if (lastPageIndex > pageRange.start) {
          doc.switchToPage(lastPageIndex - 1);
        }
      } else {
        // Last page has content (or only one page), add page numbers to all pages
        addPageNumbers();
      }
      
      // End PDF document (this will trigger the stream to close)
      console.log('Ending PDF document...');
      doc.end();
      console.log('PDF export completed successfully');
    } catch (pdfError: any) {
      console.error('========================================');
      console.error('ERROR DURING PDF GENERATION:');
      console.error('Error:', pdfError);
      console.error('Error message:', pdfError?.message);
      console.error('Error name:', pdfError?.name);
      console.error('Error stack:', pdfError?.stack);
      console.error('Headers sent?', res.headersSent);
      console.error('========================================');
      
      // If headers haven't been sent, we can send an error response
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'PDF generation error',
          details: pdfError?.message || String(pdfError) || 'Unknown error occurred',
          stack: process.env.NODE_ENV === 'development' ? pdfError?.stack : undefined
        });
      } else {
        // Headers already sent, just end the response
        // But we can't send JSON anymore
        console.error('Cannot send error response - headers already sent');
        res.end();
      }
    }
  } catch (error: any) {
    console.error('Export summary PDF error:', error);
    console.error('Error details:', error?.message);
    console.error('Error stack:', error?.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      });
    } else {
      res.end();
    }
  }
});

export default router;

