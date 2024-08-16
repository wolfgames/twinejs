import { Passage } from '../store/stories';

type PassageDefaults = Omit<Passage, 'id' | 'story'>;
type PassageDefaultsAccessor = () => PassageDefaults;

export const passageDefaultsWrapper = (defaultsAccessor: PassageDefaultsAccessor): PassageDefaultsAccessor => {
  return () => ({
    ...defaultsAccessor(),
    width: 200,
    height: 200,
  });
}
