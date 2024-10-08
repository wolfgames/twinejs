import * as React from 'react';
import {TagColors} from '../../store/stories';
import './tag-stripe.css';
import { withWolfgames } from '../../wolfgames-extension/tag-stripe-hoc';

export interface TagStripeProps {
	tagColors: TagColors;
	tags: string[];
}

export const TagStripe: React.FC<TagStripeProps> = React.memo(props => {
	return (
		<div className="tag-stripe">
			{props.tags.map(tag => withWolfgames(
				<span
					className={`color-${props.tagColors[tag]}`}
					key={tag}
					title={tag}
				/>
			))}
		</div>
	);
});

TagStripe.displayName = 'TagStripe';
