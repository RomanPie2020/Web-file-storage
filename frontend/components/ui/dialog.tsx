'use client'

import type { ReactNode } from 'react'

export function Dialog({
	open,
	onOpenChange,
	title,
	children,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	children: ReactNode
}) {
	if (!open) return null
	return (
		<div
			className='dialog-backdrop'
			role='presentation'
			onMouseDown={() => onOpenChange(false)}
		>
			<section
				className='dialog'
				role='dialog'
				aria-modal='true'
				aria-labelledby='dialog-title'
				onMouseDown={event => event.stopPropagation()}
			>
				<div className='dialog-header'>
					<h2 id='dialog-title'>{title}</h2>
					<button
						className='icon-button'
						aria-label='Close'
						onClick={() => onOpenChange(false)}
					>
						×
					</button>
				</div>
				{children}
			</section>
		</div>
	)
}
