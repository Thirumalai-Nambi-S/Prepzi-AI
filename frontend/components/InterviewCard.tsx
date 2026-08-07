import React from 'react'
import dayjs from 'dayjs'
import Link from 'next/link'
import { getRandomInterviewCover } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import DisplayTechIcons from '@/components/DisplayTechIcons'

const InterviewCard = ({ id, role, type, techstack, createdAt, coverImage, feedback }: InterviewCardProps) => {
    const normalizedType = /mix/i.test(type)
        ? 'Mixed'
        : /behav/i.test(type)
        ? 'Behavioral'
        : /tech/i.test(type)
        ? 'Technical'
        : 'Mixed';
    const formattedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY')

    return (
        <div className='card-border card-border-glow shrink-0 w-[360px] max-sm:w-full h-full min-h-96 relative transition-transform duration-300 hover:-translate-y-1 hover:z-50'>
            <div className='card-interview h-full flex flex-col justify-between'>
                <div>
                    <div className='absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg bg-light-600'>
                        <p className='badge-text'>{normalizedType}</p>
                    </div>

                    <img src={coverImage || getRandomInterviewCover()} alt="cover image" width={90} height={90} className='rounded-full object-fit size-[90px]' />

                    <h3 className='mt-5 capitalize line-clamp-2 min-h-[2lh]'>
                        {role} Interview
                    </h3>

                    <div className='flex flex-row gap-5 mt-3'>
                        <div className='flex flex-row gap-2'>
                            <img src="/calendar.svg" alt="calendar" width={22} height={22} />
                            <p>{formattedDate}</p>

                        </div>

                        <div className='flex flex-row gap-2 items-center'>
                            <img src="/star.svg" alt="star" width={22} height={22} />
                            <p>{feedback?.totalScore ?? '---'}/100</p>

                        </div>

                    </div>

                    <p className='line-clamp-2 mt-5'>
                        {feedback?.finalAssessment || 'You haven\'t taken the interview yet. Take it now to improve your skills.'}
                    </p>

                </div>

                <div className='flex flex-row justify-between items-center gap-2'>
                    <DisplayTechIcons techStack={techstack}/>
                    <div className='flex flex-row gap-2'>
                        <Button className='btn-secondary' size='sm'>
                            <Link href={`/interview/${id}`}>
                                {feedback ? 'Retake' : 'View Interview'}
                            </Link>
                        </Button>
                        {feedback && (
                            <Button className='btn-primary' size='sm'>
                                <Link href={`/interview/${id}/feedback`}>
                                    Check Feedback
                                </Link>
                            </Button>
                        )}
                    </div>

                </div>

            </div>

        </div>
    )
}

export default InterviewCard
