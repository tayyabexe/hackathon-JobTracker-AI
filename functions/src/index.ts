// Deployment Force-Refresh: 2026-04-25
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";

// Initialize Firebase Admin to securely interact with Firestore
admin.initializeApp();
export const db = admin.firestore();

// Lazy Gemini initializer - must be called inside a function handler so the
// GEMINI_API_KEY secret is already mounted by the Firebase v2 runtime.
// .trim() strips any hidden newlines or spaces injected by Secret Manager or the terminal.
function getGenAI() {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) throw new Error("GEMINI_API_KEY secret is not available in this environment.");
  const key = rawKey.trim();
  console.log(`[DEBUG] GEMINI_API_KEY loaded: length=${key.length}, prefix=${key.substring(0, 8)}`);
  return new GoogleGenerativeAI(key);
}

/**
 * AGENT 01: THE EXTRACTOR
 * Reads raw email text and strictly outputs structured JSON.
 * Temperature is set to 0.1 to eliminate creative hallucinations.
 */
export async function runExtractorAgent(rawEmailText: string) {
  // We use the flash model for maximum speed and cost-efficiency
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1, // Highly deterministic
      responseMimeType: "application/json", // Forces the AI to output valid JSON
    },
  });

  const prompt = `
    You are the Extractor Agent for an AI Job Tracking system.
    Analyze the following email related to a job application.
    Extract the requested information and return it strictly as a JSON object matching this schema.
    Do not include markdown blocks or any conversational text.

    Required Schema:
    {
      "company": "string (Name of the company, or 'Unknown')",
      "role": "string (Job title, or 'Unknown')",
      "email_type": "Must be exactly one of: APPLICATION_RECEIVED, INTERVIEW_INVITE, REJECTION, OFFER, OTHER",
      "sentiment_score": "number (0 to 100, where 0 is hostile/rejection, 50 is neutral, 100 is highly positive/excited)",
      "urgency_signals": ["array of strings (e.g., 'respond within 24 hours', 'start ASAP')"],
      "has_attachment": "boolean"
    }

    Email Content to Analyze:
    """
    ${rawEmailText}
    """
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // Parse the JSON string into a usable TypeScript object
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Extractor Agent Failed:", error);
    throw new Error("Failed to extract data from email");
  }
}

/**
 * The Gmail Webhook Listener
 * Gmail pushes notifications to a Pub/Sub topic named "gmail-events".
 * This function triggers automatically whenever a new message hits that topic.
 */
export const gmailWebhook = onMessagePublished({
  topic: "gmail-events",
  secrets: ["GEMINI_API_KEY"],
}, async (event) => {
  try {
    // SAFE PARSE: Handle both pre-decoded objects and raw base64 strings
    let gmailNotification;

    if (event.data.message.json) {
      // SDK already decoded it for us
      gmailNotification = event.data.message.json;
    } else {
      // Manual decode for raw strings
      const base64Data = event.data.message.data;
      const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
      gmailNotification = JSON.parse(decodedData);
    }

    const userEmail = gmailNotification.emailAddress;
    if (!userEmail) {
      console.log("No emailAddress found in payload. Aborting.");
      return true;
    }

    console.log("Live Ping Received for:", userEmail);

    // 1. Find the User & their Access Token
    const usersRef = db.collection("users");
    const userSnapshot = await usersRef.where("email", "==", userEmail).limit(1).get();
    
    if (userSnapshot.empty) {
      console.log("User not found in DB. Aborting.");
      return true; 
    }
    
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    if (!userData.gmailAccessToken) {
      console.log("No Gmail Access Token found for user.");
      return true;
    }

    // 2. Connect to the Live Gmail API
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: userData.gmailAccessToken });
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // 3. Fetch the latest unread message
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread', // Target unread emails
      maxResults: 1
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      console.log("No new unread messages found.");
      return true;
    }

    const messageId = response.data.messages[0].id!;
    const messageDetails = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full' // Get the payload
    });

    // We use the snippet for the hackathon (it contains the first ~200 chars of the email)
    // This is incredibly token-efficient and usually contains all the context Gemini needs.
    const liveEmailText = messageDetails.data.snippet || "No content";
    console.log("Extracted Live Text:", liveEmailText);

    // 4. Run the Extractor Agent on the LIVE data
    const extractedData = await runExtractorAgent(liveEmailText);

    // 5. Find or Create the Application record
    const appsRef = db.collection("applications");
    const appQuery = await appsRef
      .where("userId", "==", userId)
      .where("company", "==", extractedData.company)
      .limit(1)
      .get();

    let applicationId = "";
    if (appQuery.empty) {
      const newApp = await appsRef.add({
        userId: userId,
        company: extractedData.company,
        role: extractedData.role,
        status: 'Applied',
        offerProbability: 0, // This will be updated in Phase 4
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      applicationId = newApp.id;
    } else {
      applicationId = appQuery.docs[0].id;
    }

    // 6. Save the Email Event
    await db.collection("email_events").add({
      applicationId: applicationId,
      emailType: extractedData.email_type,
      sentimentScore: extractedData.sentiment_score,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      gmailMessageId: messageId
    });

    // 7. Save the Agent Reasoning
    await db.collection("agent_reasoning").add({
      applicationId: applicationId,
      extractorOutput: extractedData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Success: Logged ${extractedData.email_type} for ${extractedData.company}`);
    return true;

  } catch (error) {
    console.error("Error in Webhook Pipeline:", error);
    return false;
  }
});

/**
 * AGENT 02: THE ANALYST
 * Updates the Offer Probability Score based on PRD rules.
 * Temperature: 0.3 (Some reasoning, highly structured).
 */
async function runAnalystAgent(currentProbability: number, eventType: string, sentiment: number) {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
  });

  const prompt = `
    You are the Analyst Agent. The current offer probability for this job is ${currentProbability}/100.
    A new email event just occurred: Type: ${eventType}, Sentiment Score: ${sentiment}/100.
    
    Calculate the new probability based on these PRD rules:
    - Interview scheduled/invite: +25 points
    - Fast positive reply (High sentiment): +15 points
    - Generic reply: -5 points
    - Rejection: force to 0
    - Limit the max score to 100.

    Output strictly in this JSON schema:
    {
      "probability_before": number,
      "probability_after": number,
      "delta": number,
      "reasoning": ["string explaining the math"],
      "risk_flags": ["string (any warnings like 'low sentiment detected')"]
    }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

/**
 * AGENT 03: THE STRATEGIST
 * Decides the next action and drafts the email.
 * Temperature: 0.5 (More natural language for drafting emails).
 */
async function runStrategistAgent(analystData: any, companyName: string, eventType: string) {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.5, responseMimeType: "application/json" }
  });

  const prompt = `
    You are the Strategist Agent. The application for ${companyName} just had an event: ${eventType}.
    The Analyst calculated the probability is now ${analystData.probability_after}/100.

    Decide the SINGLE best next action from this list: ['FOLLOW_UP', 'PREP_INTERVIEW', 'THANK_YOU', 'NEGOTIATE', 'WRITE_OFF'].
    Draft a highly professional, brief email message if applicable (or a prep checklist for an interview).

    Output strictly in this JSON schema:
    {
      "action_type": "string",
      "draft_message": "string (the actual email body or checklist)",
      "action_reasoning": "string (why you chose this action)"
    }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

/**
 * THE EVENT TRIGGER
 * Fires automatically when a new email event is saved to Firestore.
 */
export const processNewEmailEvent = onDocumentCreated({
  document: "email_events/{eventId}",
  secrets: ["GEMINI_API_KEY"],
}, async (event) => {
  const eventData = event.data?.data();
  if (!eventData) return;

  const applicationId = eventData.applicationId;

  try {
    console.log(`Triggered AI Engine for Application: ${applicationId}`);

    // 1. Get the current application data
    const appRef = db.collection("applications").doc(applicationId);
    const appDoc = await appRef.get();
    if (!appDoc.exists) return;
    const appData = appDoc.data()!;

    // 2. Run the Analyst Agent
    const analystOutput = await runAnalystAgent(
      appData.offerProbability || 0,
      eventData.emailType,
      eventData.sentimentScore
    );

    // 3. Run the Strategist Agent
    const strategistOutput = await runStrategistAgent(
      analystOutput,
      appData.company,
      eventData.emailType
    );

    // 4. Update the Application with the new probability score
    await appRef.update({
      offerProbability: analystOutput.probability_after,
      status: eventData.emailType === 'REJECTION' ? 'Closed' : appData.status
    });

    // 5. Add the recommended action to the Action Queue
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2); // Default to 48 hours from now

    await db.collection("action_queue").add({
      applicationId: applicationId,
      actionType: strategistOutput.action_type,
      deadline: admin.firestore.Timestamp.fromDate(deadline),
      draftContent: strategistOutput.draft_message,
      status: 'pending'
    });

    // 6. Append this reasoning to the agent_reasoning collection for the UI
    await db.collection("agent_reasoning").add({
      applicationId: applicationId,
      analystOutput: analystOutput,
      strategistOutput: strategistOutput,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully processed Engine pipeline for ${appData.company}`);
  } catch (error) {
    console.error("AI Engine Pipeline Error:", error);
  }
});
