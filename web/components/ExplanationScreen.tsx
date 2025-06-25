"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { chain2 } from "~~/config/chains-config";

interface ExplanationScreenProps {
  onClose: () => void;
  isFirstVisit?: boolean;
}

export const ExplanationScreen: React.FC<ExplanationScreenProps> = ({ onClose, isFirstVisit = false }) => {
  const [prerequisitesCompleted, setPrerequisitesCompleted] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl overflow-auto max-h-[90vh] relative">
        {!isFirstVisit && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700 dark:text-gray-300"
            >
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        )}

        <CardHeader>
          <CardTitle className="text-xl">ZKsync Prividium</CardTitle>
          <CardDescription>Institutional Usecases Demo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 -mt-3">
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Prerequisites:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/2364824?hl=en&co=GENIE.Platform%3DDesktop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  2 Chrome Profiles
                </a>{" "}
                - to simulate different users
              </li>
              <li>
                <a
                  href="https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  MetaMask
                </a>{" "}
                wallet installed on both profiles
              </li>
              <li>
                <a
                  href={`${chain2.blockExplorers.default.url}/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Chain B RPC Authorization
                </a>{" "}
                via Block Explorer for second profile
              </li>
            </ul>
          </div>

          {isFirstVisit && (
            <div className="pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  id="prerequisites"
                  checked={prerequisitesCompleted}
                  onCheckedChange={checked => {
                    setPrerequisitesCompleted(checked === true);
                  }}
                />
                <span
                  className="text-sm font-medium leading-none select-none"
                  onClick={() => setPrerequisitesCompleted(!prerequisitesCompleted)}
                >
                  I confirm that I have completed all the prerequisites
                </span>
              </label>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onClose} disabled={isFirstVisit && !prerequisitesCompleted}>
            {isFirstVisit ? "Got it, let's start" : "Close"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
