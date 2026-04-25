import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Initialize the Gmail API client with the user's token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    // Call the Watch API to start forwarding notifications to our Pub/Sub topic
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'], // Only watch the main inbox
        labelFilterAction: 'include',
        // IMPORTANT: We will configure this Pub/Sub topic in Google Cloud later.
        // Replace 'your_project_id' with your actual Firebase Project ID from your .env.local file
        topicName: `projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/topics/gmail-events`
      }
    });

    return NextResponse.json({ 
      success: true, 
      historyId: watchResponse.data.historyId 
    });

  } catch (error) {
    console.error('Error activating Gmail Watch API:', error);
    return NextResponse.json({ error: 'Failed to activate Gmail Watch API' }, { status: 500 });
  }
}
