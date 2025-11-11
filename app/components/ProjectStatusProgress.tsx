'use client'

import React from 'react'
import { Check, Clock, AlertCircle, X, Pause } from 'lucide-react'

interface ProjectStatusProgressProps {
  currentStatus: string
  compact?: boolean
}

const statusSteps = [
  { key: 'pending_upload', label: 'Upload', icon: Clock, color: 'gray' },
  { key: 'pending_architect', label: 'Review', icon: Clock, color: 'amber' },
  { key: 'in_progress', label: 'Design', icon: Clock, color: 'blue' },
  { key: 'pending_review', label: 'Approval', icon: Clock, color: 'purple' },
  { key: 'active', label: 'Active', icon: Check, color: 'green' },
]

const specialStatuses = {
  'on_hold': { label: 'On Hold', icon: Pause, color: 'amber' },
  'completed': { label: 'Completed', icon: Check, color: 'green' },
  'cancelled': { label: 'Cancelled', icon: X, color: 'red' },
}

export default function ProjectStatusProgress({ currentStatus, compact = false }: ProjectStatusProgressProps) {
  // Check if it's a special status
  if (specialStatuses[currentStatus as keyof typeof specialStatuses]) {
    const special = specialStatuses[currentStatus as keyof typeof specialStatuses]
    const Icon = special.icon
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Icon className={`w-4 h-4 text-${special.color}-500`} />
        <span className={`font-medium text-${special.color}-600 dark:text-${special.color}-400`}>
          {special.label}
        </span>
      </div>
    )
  }

  const currentStepIndex = statusSteps.findIndex(step => step.key === currentStatus)
  
  return (
    <div className="w-full">
      {compact ? (
        // Compact version: Simple progress bar with tooltips
        <div className="space-y-1.5">
          {/* Progress Dots */}
          <div className="flex items-center gap-1">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const Icon = step.icon
              
              return (
                <React.Fragment key={step.key}>
                  {/* Each step takes equal width */}
                  <div className="flex-1 flex flex-col items-center">
                    {/* Status Label - reserve space for all dots to maintain alignment */}
                    <div className="h-5 flex items-center justify-center mb-1 w-full">
                      {isCurrent && (
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-center">
                          {step.label}
                        </div>
                      )}
                    </div>
                    
                    {/* Dot */}
                    <div 
                      className={`
                        flex items-center justify-center rounded-full transition-all cursor-help flex-shrink-0
                        ${isCurrent ? 'w-6 h-6' : 'w-5 h-5'}
                        ${isCompleted 
                          ? 'bg-accent-highlight' 
                          : isCurrent 
                            ? 'bg-purple-600 dark:bg-purple-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }
                      `}
                      title={`${step.label}${isCompleted ? ' (Completed)' : isCurrent ? ' (Current)' : ''}`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : 'bg-gray-400 dark:bg-gray-600'}`} />
                      )}
                    </div>
                  </div>
                  
                  {/* Connecting line between dots */}
                  {index < statusSteps.length - 1 && (
                    <div className={`h-0.5 flex-1 self-center transition-colors ${
                      isCompleted ? 'bg-accent-highlight' : 'bg-gray-200 dark:bg-gray-700'
                    }`} style={{ marginTop: '1.75rem' }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
          
          {/* Stage Counter */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Step {currentStepIndex + 1} of {statusSteps.length}
          </div>
        </div>
      ) : (
        // Full version: Detailed progress with labels
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{statusSteps[currentStepIndex]?.label || 'Unknown'}</span>
            <span>{currentStepIndex + 1} of {statusSteps.length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const Icon = step.icon
              
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      flex items-center justify-center rounded-full transition-all mb-1
                      ${isCurrent ? 'w-8 h-8' : 'w-6 h-6'}
                      ${isCompleted 
                        ? 'bg-accent-highlight' 
                        : isCurrent 
                          ? 'bg-purple-600 dark:bg-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : isCurrent ? (
                        <Icon className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600" />
                      )}
                    </div>
                    
                    <span className={`text-xs text-center whitespace-nowrap ${
                      isCurrent 
                        ? 'font-medium text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  
                  {index < statusSteps.length - 1 && (
                    <div className={`h-0.5 w-full flex-1 mt-[-16px] transition-colors ${
                      isCompleted ? 'bg-accent-highlight' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

