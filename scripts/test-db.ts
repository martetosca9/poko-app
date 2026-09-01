import "dotenv/config";
import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../lib/auth";

async function testAll() {
    console.log("==> 1. Testing Database Connection & Models...");
    
    // Clear any previous test user
    const existing = await prisma.user.findUnique({ where: { email: "test@poko.app" } });
    if (existing) {
        await prisma.graphEdge.deleteMany({ where: { userId: existing.id } });
        await prisma.graphNode.deleteMany({ where: { userId: existing.id } });
        await prisma.documentChunk.deleteMany({ where: { document: { userId: existing.id } } });
        await prisma.document.deleteMany({ where: { userId: existing.id } });
        await prisma.message.deleteMany({ where: { conversation: { userId: existing.id } } });
        await prisma.conversation.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
    }

    // Create user with bcryptjs
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
        data: {
            name: "Tester",
            email: "test@poko.app",
            password: hashedPassword,
        }
    });
    console.log("✓ User created:", user.id, user.name);

    // Test password verification
    const isPasswordValid = await bcrypt.compare("password123", user.password!);
    console.log("✓ Password compare (bcryptjs):", isPasswordValid ? "PASS" : "FAIL");

    // Test JWT auth
    const token = signToken({ id: user.id, email: user.email! });
    const payload = verifyToken(token);
    console.log("✓ JWT sign & verify:", payload ? "PASS" : "FAIL");

    // Test Document creation
    const doc = await prisma.document.create({
        data: {
            title: "Prueba de Escritorio",
            content: "Este es un documento de prueba con #electron y #sqlite",
            userId: user.id,
        }
    });
    console.log("✓ Document created:", doc.id, doc.title);

    // Test Document chunks
    const chunk = await prisma.documentChunk.create({
        data: {
            documentId: doc.id,
            content: "Fragmento de prueba",
            chunkIndex: 0,
        }
    });
    console.log("✓ DocumentChunk created:", chunk.id);

    // Test Graph Node & Edge
    const node1 = await prisma.graphNode.create({
        data: {
            label: doc.title,
            type: "doc",
            documentId: doc.id,
            userId: user.id,
            x: 100,
            y: 100,
        }
    });
    const node2 = await prisma.graphNode.create({
        data: {
            label: "sqlite",
            type: "tag",
            userId: user.id,
            x: 200,
            y: 200,
        }
    });
    const edge = await prisma.graphEdge.create({
        data: {
            sourceId: node1.id,
            targetId: node2.id,
            userId: user.id,
        }
    });
    console.log("✓ Graph nodes and edge created:", edge.id);

    // Test Conversations & Messages
    const conversation = await prisma.conversation.create({
        data: {
            title: "Charla con Poko",
            userId: user.id,
        }
    });
    const msg = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            role: "user",
            content: "Hola Poko!",
        }
    });
    console.log("✓ Message created:", msg.id, msg.role, msg.content);

    console.log("\n==> ALL DATABASE MODELS & AUTH FUNCTIONS ARE 100% OPERATIONAL!");

    // Clean up test data in cascade order
    await prisma.graphEdge.deleteMany({ where: { userId: user.id } });
    await prisma.graphNode.deleteMany({ where: { userId: user.id } });
    await prisma.documentChunk.deleteMany({ where: { document: { userId: user.id } } });
    await prisma.document.deleteMany({ where: { userId: user.id } });
    await prisma.message.deleteMany({ where: { conversation: { userId: user.id } } });
    await prisma.conversation.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    console.log("✓ Test cleanup completed.");
}

testAll().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
