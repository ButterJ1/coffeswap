import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js';

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { payload, nonce } = (await req.json()) as IRequestPayload;
    
    // Get the nonce from the cookie - await the cookies function
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get('siwe')?.value;
    
    // Verify that the nonce matches
    if (!storedNonce || nonce !== storedNonce) {
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'Invalid nonce',
      }, { status: 400 });
    }
    
    // Verify the SIWE message
    try {
      const validMessage = await verifySiweMessage(payload, storedNonce);
      
      if (validMessage.isValid) {
        // Successfully authenticated!
        // Clear the cookie - await cookies function again
        cookieStore.delete('siwe');
        
        return NextResponse.json({
          status: 'success',
          isValid: true,
          address: payload.address,
        });
      } else {
        return NextResponse.json({
          status: 'error',
          isValid: false,
          message: 'Invalid signature',
        }, { status: 400 });
      }
    } catch (error: any) {
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: error.message || 'Signature verification failed',
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      isValid: false,
      message: error.message || 'Failed to process request',
    }, { status: 500 });
  }
}