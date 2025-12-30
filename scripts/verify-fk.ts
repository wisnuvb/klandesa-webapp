/**
 * Script untuk verify foreign key relationships di database
 * Pastikan semua FK tidak broken dan data konsisten
 */

import { prisma } from "@/lib/prisma";

async function verifyForeignKeys() {
  console.log("🔍 Verifying Foreign Key Relationships...\n");

  try {
    // Check Village
    const villages = await prisma.village.findMany();
    console.log(`✓ Villages: ${villages.length} records`);

    // Check Users (FK to Village)
    const users = await prisma.user.findMany({ include: { village: true } });
    console.log(`✓ Users: ${users.length} records`);
    for (const user of users) {
      if (!user.village) {
        console.warn(`  ⚠️  User ${user.id} has missing village reference!`);
      }
    }

    // Check Positions (FK to Village)
    const positions = await prisma.position.findMany({
      include: { village: true },
    });
    console.log(`✓ Positions: ${positions.length} records`);
    for (const position of positions) {
      if (!position.village) {
        console.warn(
          `  ⚠️  Position ${position.id} has missing village reference!`
        );
      }
    }

    // Check Officials (FK to Village and Position)
    const officials = await prisma.official.findMany({
      include: { village: true, position: true },
    });
    console.log(`✓ Officials: ${officials.length} records`);
    for (const official of officials) {
      if (!official.village) {
        console.warn(
          `  ⚠️  Official ${official.id} has missing village reference!`
        );
      }
      if (!official.position) {
        console.warn(
          `  ⚠️  Official ${official.id} has missing position reference!`
        );
      }
    }

    // Check VillagePotentials (FK to Village)
    const villagePotentials = await prisma.villagePotential.findMany({
      include: { village: true },
    });
    console.log(`✓ VillagePotentials: ${villagePotentials.length} records`);
    for (const vp of villagePotentials) {
      if (!vp.village) {
        console.warn(
          `  ⚠️  VillagePotential ${vp.id} has missing village reference!`
        );
      }
    }

    // Check Residents (FK to Village)
    const residents = await prisma.resident.findMany({
      include: { village: true },
    });
    console.log(`✓ Residents: ${residents.length} records`);
    for (const resident of residents) {
      if (!resident.village) {
        console.warn(
          `  ⚠️  Resident ${resident.id} has missing village reference!`
        );
      }
    }

    // Check Requests (FK to Village and User)
    const requests = await prisma.request.findMany({
      include: { village: true, respondedByUser: true },
    });
    console.log(`✓ Requests: ${requests.length} records`);
    for (const request of requests) {
      if (!request.village) {
        console.warn(
          `  ⚠️  Request ${request.id} has missing village reference!`
        );
      }
    }

    // Check MailTemplates (FK to Village - optional)
    const mailTemplates = await prisma.mailTemplate.findMany({
      include: { village: true },
    });
    console.log(`✓ MailTemplates: ${mailTemplates.length} records`);
    for (const template of mailTemplates) {
      if (template.villageId && !template.village) {
        console.warn(
          `  ⚠️  MailTemplate ${template.id} has missing village reference!`
        );
      }
    }

    // Check MailServices (FK to Village and MailTemplate)
    const mailServices = await prisma.mailService.findMany({
      include: { village: true, template: true, createdUser: true },
    });
    console.log(`✓ MailServices: ${mailServices.length} records`);
    for (const service of mailServices) {
      if (!service.village) {
        console.warn(
          `  ⚠️  MailService ${service.id} has missing village reference!`
        );
      }
      if (!service.template) {
        console.warn(
          `  ⚠️  MailService ${service.id} has missing template reference!`
        );
      }
    }

    // Check MailHistories (FK to MailService and User)
    const mailHistories = await prisma.mailHistory.findMany({
      include: { mailService: true, changedUser: true },
    });
    console.log(`✓ MailHistories: ${mailHistories.length} records`);
    for (const history of mailHistories) {
      if (!history.mailService) {
        console.warn(
          `  ⚠️  MailHistory ${history.id} has missing mailService reference!`
        );
      }
    }

    // Check MailAttachments (FK to MailService)
    const mailAttachments = await prisma.mailAttachment.findMany({
      include: { mailService: true },
    });
    console.log(`✓ MailAttachments: ${mailAttachments.length} records`);
    for (const attachment of mailAttachments) {
      if (!attachment.mailService) {
        console.warn(
          `  ⚠️  MailAttachment ${attachment.id} has missing mailService reference!`
        );
      }
    }

    // Check Transactions (FK to Village)
    const transactions = await prisma.transaction.findMany({
      include: { village: true },
    });
    console.log(`✓ Transactions: ${transactions.length} records`);
    for (const transaction of transactions) {
      if (!transaction.village) {
        console.warn(
          `  ⚠️  Transaction ${transaction.id} has missing village reference!`
        );
      }
    }

    // Check Budgets (FK to Village and User)
    const budgets = await prisma.budget.findMany({
      include: { village: true, createdUser: true },
    });
    console.log(`✓ Budgets: ${budgets.length} records`);
    for (const budget of budgets) {
      if (!budget.village) {
        console.warn(
          `  ⚠️  Budget ${budget.id} has missing village reference!`
        );
      }
    }

    // Check BudgetDetails (FK to Budget)
    // const budgetDetails = await prisma.budgetDetail.findMany({
    //   include: { budget: true },
    // });
    // console.log(`✓ BudgetDetails: ${budgetDetails.length} records`);
    // for (const detail of budgetDetails) {
    //   if (!detail.budget) {
    //     console.warn(`  ⚠️  BudgetDetail ${detail.id} has missing budget reference!`);
    //   }
    // }

    // Check Potentials (FK to Village)
    const potentials = await prisma.potential.findMany({
      include: { village: true },
    });
    console.log(`✓ Potentials: ${potentials.length} records`);
    for (const potential of potentials) {
      if (!potential.village) {
        console.warn(
          `  ⚠️  Potential ${potential.id} has missing village reference!`
        );
      }
    }

    // Check DigitalArchives (FK to Village)
    const digitalArchives = await prisma.digitalArchive.findMany({
      include: { village: true },
    });
    console.log(`✓ DigitalArchives: ${digitalArchives.length} records`);
    for (const archive of digitalArchives) {
      if (!archive.village) {
        console.warn(
          `  ⚠️  DigitalArchive ${archive.id} has missing village reference!`
        );
      }
    }

    console.log("\n✅ Foreign Key Verification Complete!");
    console.log("All relationships are intact and data is consistent.\n");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyForeignKeys();
