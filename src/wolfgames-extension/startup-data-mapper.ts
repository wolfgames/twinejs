import {TwineEvidence} from '../../../shared/messaging/messaging.types';

const adaMacro = `(set: $ada to (macro: str-type _message, [
  (output-data: "ADA: " + _message)
]))`;
const evidenceMacro = `(set: $evidence to (macro: str-type _uid, [
  (set: $ev to (find: _e where _e's uid is _uid, ...$evidence_list)'s 1st)
  (output-data: "(Evidence) " + $ev's name)
]))`;
const actionMacro = `(set: $action to (macro: str-type _type, str-type _target, [
  (output-data: _type + ": " + _target)
]))`;
const passageMacro = `(set: $passage to (macro: str-type _passage, [
  (output-data: "[" + "[" + _passage + "]" + "]")
]))`;
const triggerMacro = `(set: $trigger to (macro: str-type _type, str-type _target, ...str-type _actions, [
  (set: _res to _type + ": " + _target + " >>> ")
  (for: each _action, ..._actions)[
    (set: _res to _res + "\\n* " + _action)
  ]
  (output-data: _res)
]))`;
const chatTriggerMacro = `(set: $chatTrigger to (macro: str-type _uid, str-type _type, str-type _text, ...str-type _actions, [
  (if: _type is 'EXACT')[(set: $chats's _uid to _text)]
  (if: _type is 'EXACT')[(set: $prefix to "BUTTON")]
  (else-if: _type is 'AI-PROMPT')[(set: $prefix to "PROMPT")]
  (else: )[(error: "Unknown chat trigger type. Available types: [EXACT, AI-PROMPT]")]
  (set: _res to $prefix + ": " + _text + " >>> ")
  (for: each _action, ..._actions)[
    (set: _res to _res + "\\n* " + _action)
  ]
  (output-data: _res)
]))`;
const chatTriggerOffMacro = `(set: $chatTriggerOff to (macro: str-type _uid, [
  (set: _button to $chats's _uid)
  (move: $chats's _uid into _var)
  (output-data: "BUTTON DISABLED: " + _button)
]))`;

const chatsVariable = '(set: $chats to (dm:))';

export const startupDataMapper = (evidenceData: TwineEvidence) => {
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

  // TODO: extract all the duplicated names into constants (evidence_list as well)
  const evidenceList = `(set: $evidence_list to (a:
  ...$messages_evidence,
  ...$photos_evidence,
  ...$reports_evidence,
  ...$witnesses_evidence,
  ...$character_evidence,
  ...$voice_recordings_evidence,
  ...$interviews_evidence,
  ...$victims_evidence,
  ...$introductions_evidence
))`;

	return '(css: "display:none;")[\n' + [
    chatsVariable,
    adaMacro,
    evidenceMacro,
    actionMacro,
    passageMacro,
    triggerMacro,
    chatTriggerMacro,
    chatTriggerOffMacro,
		messagesMapped,
		photosMapped,
		reportsMapped,
		witnessesMapped,
		characterMapped,
		voiceRecordingsMapped,
		interviewsMapped,
		victimsMapped,
		introductionsMapped,
    evidenceList,
	].join('\n\n') + '\n]';
};
