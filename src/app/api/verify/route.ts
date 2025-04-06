import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, ISuccessResult, IVerifyResponse } from '@worldcoin/minikit-js';

interface IRequestPayload {
  payload: ISuccessResult;
  action: string;
  signal: string | undefined;
}

// Extend the built-in IVerifyResponse with our custom properties
interface VerifyResponse extends IVerifyResponse {
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = (await req.json()) as IRequestPayload;
    
    const app_id = process.env.APP_ID as `app_${string}`;
    
    if (!app_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'APP_ID environment variable not set'
      });
    }
    
    const verifyRes = await verifyCloudProof(payload, app_id, action, signal) as VerifyResponse;
    
    if (verifyRes.success) {
      return NextResponse.json({ 
        success: true,
        verifyRes
      });
    } else {
      // Safely access the error property with optional chaining
      return NextResponse.json({ 
        success: false,
        error: verifyRes.error || 'Verification failed'
      });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to process request'
    });
  }
}