import {TwineEvidence} from '../../../shared/messaging/messaging.types';

export enum TwineCustomCommand {
  Bot = '$bot',
  BotMessage = '$botMessage',
  Evidence = '$evidence',
  Action = '$action',
  Passage = '$passage',
  TriggerTarget = '$triggerTarget',
  Trigger = '$trigger',
  ChatTrigger = '$chatTrigger',
  ChatTriggerOff = '$chatTriggerOff',
}

const botMacro = `(set: ${TwineCustomCommand.Bot} to (macro: ...str-type _messages, [
  (set: _res to "ADA: >>> ")
  (for: each _message, ..._messages)[
    (set: _res to _res + "\\n* " + _message)
  ]
  (output-data: _res)
]))`;
const imageAsText = `(text: "<" + "img src='" + $images's _imageUid + "'>")`;
const botMessage = `(set: ${TwineCustomCommand.BotMessage} to (macro: str-type _text, str-type _identifier, [
  (set: _imageUid to "")
  (if: $uidAliasMap contains _identifier)[
    (set: _imageUid to $uidAliasMap's _identifier)
  ](else:)[
    (set: _imageUid to _identifier)
  ]
  (set: _res to "")
  (if: _text is not "")[
     (set: _res to _res + _text)
  ]
  (if: _imageUid is not "")[
     (set: _nextLine to "")
     (if: _text is not "")[
       (set: _nextLine to "<br />")
     ]
     (set: _res to _res + _nextLine + ${imageAsText})
  ]
  (output-data: _res)
]))`;
const evidenceMacro = `(set: ${TwineCustomCommand.Evidence} to (macro: str-type _identifier, [
  (set: _uid to "")
  (if: $uidAliasMap contains _identifier)[
    (set: _uid to $uidAliasMap's _identifier)
  ](else:)[
    (set: _uid to _identifier)
  ]
  (set: $ev to (find: _e where _e's uid is _uid, ...$evidence_list)'s 1st)
  (output-data: "(Evidence) " + $ev's name)
]))`;
const actionMacro = `(set: ${TwineCustomCommand.Action} to (macro: str-type _type, str-type _target, [
  (output-data: _type + ": " + _target)
]))`;
const passageMacro = `(set: ${TwineCustomCommand.Passage} to (macro: str-type _passage, [
  (output-data: "[" + "[" + _passage + "]" + "]")
]))`;
const triggerTargetMacro = `(set: ${TwineCustomCommand.TriggerTarget} to (macro: str-type _type, str-type _target, [
  (output-data: (dm:
    "type", _type,
    "target", _target
  ))
]))`;
const triggerMacro = `(set: ${TwineCustomCommand.Trigger} to (macro: any-type _targets, ...str-type _actions, [
  (set: _res to "")
  (if: _targets matches (a:
    ...(datatype:(dm:
      "type", str,
      "target", str
    ))
  ))[
    (for: each _target, ..._targets)[
      (set: _res to _res + "\\n* " + _target's "type" + ": " + _target's "target")
    ]
    (set: _res to _res + " >>> ")
    (for: each _action, ..._actions)[
      (set: _res to _res + "\\n** " + _action)
    ]
  ](elseif: _targets matches (dm:
    "type", str,
    "target", str
  ))[
    (set: _res to _targets's "type" + ": " + _targets's "target" + " >>> ")
    (for: each _action, ..._actions)[
      (set: _res to _res + "\\n* " + _action)
    ]
  ](else:)[
    (error: "Invalid input for trigger target param")
  ]
  (output-data: _res)
]))`;
const chatTriggerMacro = `(set: ${TwineCustomCommand.ChatTrigger} to (macro: str-type _uid, str-type _type, str-type _text, ...str-type _actions, [
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
const chatTriggerOffMacro = `(set: ${TwineCustomCommand.ChatTriggerOff} to (macro: str-type _uid, [
  (if: $chats contains _uid)[
    (set: _button to $chats's _uid)
    (move: $chats's _uid into _var)
    (output-data: "BUTTON DISABLED: " + _button)
  ](else:)[
    (output-data: "BUTTON DISABLED: " + "(colour: red)[Unregistered button]")
  ]
]))`;

const chatsVariable = '(set: $chats to (dm:))';

export const startupDataMapper = (evidenceData: TwineEvidence) => {
	const interviewEvidenceToData = (
		i: TwineEvidence[keyof TwineEvidence][0]
	) => {
		return `(dm:${Object.entries(i)
			.flatMap(([iKey, iValue]) => [`"${iKey}"`, `"${iValue.replaceAll('"', '\\"')}"`])
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
	const characterMapped = `(set: $character_evidence to (a:${evidenceData.character
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const voiceRecordingsMapped = `(set: $voice_recordings_evidence to (a:${evidenceData.voiceRecordings
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const interviewsMapped = `(set: $interviews_evidence to (a:${evidenceData.interviews
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const introductionsMapped = `(set: $introductions_evidence to (a:${evidenceData.introductions
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const cctvMapped = `(set: $cctv_evidence to (a:${evidenceData.cctv
		.map(interviewEvidenceToData)
		.join(',')}))`;
	const nonesMapped = `(set: $nones_evidence to (a:${evidenceData.nones
		.map(interviewEvidenceToData)
		.join(',')}))`;

  // TODO: extract all the duplicated names into constants (evidence_list as well)
  const evidenceList = `(set: $evidence_list to (a:
  ...$messages_evidence,
  ...$photos_evidence,
  ...$reports_evidence,
  ...$character_evidence,
  ...$voice_recordings_evidence,
  ...$interviews_evidence,
  ...$introductions_evidence,
  ...$cctv_evidence,
  ...$nones_evidence
))`;

	return '(css: "display:none;")[\n' + [
    chatsVariable,
    botMacro,
    botMessage,
    evidenceMacro,
    actionMacro,
    passageMacro,
    triggerTargetMacro,
    triggerMacro,
    chatTriggerMacro,
    chatTriggerOffMacro,
		messagesMapped,
		photosMapped,
		reportsMapped,
		characterMapped,
		voiceRecordingsMapped,
		interviewsMapped,
		introductionsMapped,
    cctvMapped,
    nonesMapped,
    evidenceList,
	].join('\n\n') + '\n]';
};
