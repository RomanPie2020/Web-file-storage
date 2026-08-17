'use client'

import type { ReactNode } from 'react'
import styles from './dialog.module.css'

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
			className={styles.backdrop}
			role='presentation'
			onMouseDown={() => onOpenChange(false)}
		>
			<section
				className={styles.dialog}
				role='dialog'
				aria-modal='true'
				aria-labelledby='dialog-title'
				onMouseDown={event => event.stopPropagation()}
			>
				<div className={styles.header}>
					<h2 id='dialog-title'>{title}</h2>
					<button
						className={styles.iconButton}
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
