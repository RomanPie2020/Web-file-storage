'use client'
import type { ReactNode } from 'react'
export function Toast({
	children,
	onClose,
}: {
	children: ReactNode
	onClose: () => void
}) {
	return (
		<div className='toast' role='status'>
			{children}
			<button className='icon-button' aria-label='Dismiss' onClick={onClose}>
				×
			</button>
		</div>
	)
}
