'use client'
import type { ReactNode } from 'react'
import styles from './toast.module.css'
export function Toast({
	children,
	onClose,
}: {
	children: ReactNode
	onClose: () => void
}) {
	return (
		<div className={styles.toast} role='status'>
			{children}
			<button className={styles.iconButton} aria-label='Dismiss' onClick={onClose}>
				×
			</button>
		</div>
	)
}
