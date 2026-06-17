import './UsabitPeopleLogo.css';

type Props = {
  height?: number;
  className?: string;
  style?: React.CSSProperties;
};

export const UsabitPeopleLogo = ({ height = 26, className, style }: Props) => (
  <img
    src={`${import.meta.env.BASE_URL}logos/usabit-people-logo-animated.svg`}
    alt="Usabit people"
    className={`usabit-people-logo-img ${className ?? ''}`}
    style={{ height, display: 'block', ...style }}
    aria-label="Usabit people"
  />
);
