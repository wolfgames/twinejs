import {TwineEvidence} from '../../../shared/messaging/messaging.types';

export const evidenceDataMapper = (evidenceData: TwineEvidence) => {
	const interviewEvidenceToData = (
		i: TwineEvidence[keyof TwineEvidence][0]
	) => {
		return `(dm:${Object.entries(i)
			.flatMap(([iKey, iValue]) => [`"${iKey}"`, `"${iValue}"`])
			.join(',')})`;
	};

	const messagesMapped = `(set: $messages_evidence to (a:${evidenceData.messages
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const photosMapped = `(set: $photos_evidence to (a:${evidenceData.photos
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const reportsMapped = `(set: $reports_evidence to (a:${evidenceData.reports
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const witnessesMapped = `(set: $witnesses_evidence to (a:${evidenceData.witnesses
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const characterMapped = `(set: $character_evidence to (a:${evidenceData.character
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const voiceRecordingsMapped = `(set: $voice_recordings_evidence to (a:${evidenceData.voiceRecordings
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const interviewsMapped = `(set: $interviews_evidence to (a:${evidenceData.interviews
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const victimsMapped = `(set: $victims_evidence to (a:${evidenceData.victims
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const introductionsMapped = `(set: $introductions_evidence to (a:${evidenceData.introductions
		.map(interviewEvidenceToData)
		.join(',')}))`;

	return [
		messagesMapped,
		photosMapped,
		reportsMapped,
		witnessesMapped,
		characterMapped,
		voiceRecordingsMapped,
		interviewsMapped,
		victimsMapped,
		introductionsMapped,
    '(redirect: $entry)',
	].join('\n\n');
};
