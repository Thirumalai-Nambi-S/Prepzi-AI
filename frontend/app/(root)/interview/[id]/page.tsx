"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import Agent from "@/components/Agent";
import RoundedInterview from "@/components/RoundedInterview";
import { apiGetInterviewById } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import Spinner from "@/components/Spinner";

const Page = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetInterviewById(id)
      .then(({ interview }) => setInterview(interview))
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }
  if (!interview) return null;

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <img
              src={interview.coverImage || "/tech.svg"}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-[40px]"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>
          <DisplayTechIcons techStack={interview.techstack} />
        </div>
        <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit capitalize">{interview.type}</p>
      </div>

      {interview.rounds ? (
        <RoundedInterview interview={interview} userName={user?.name || ""} userId={user?.id || ""} />
      ) : (
        <Agent
          userName={user?.name || ""}
          userId={user?.id || ""}
          interviewId={id}
          type="interview"
          questions={interview.questions}
        />
      )}
    </>
  );
};

export default Page;
