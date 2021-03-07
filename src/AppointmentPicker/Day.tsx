import React, { Component } from 'react';
import DayName from './DayName';

interface DayProps {
  dayName: string;
  actualDay?: any;
  visible: boolean;
  isSelected: boolean;
  children: React.ReactNode;
}

export class Day extends Component<DayProps> {
  render() {
    const { visible, dayName, isSelected, actualDay } = this.props;
    var dayNumber = actualDay.getUTCDate();
    var monthNumber = actualDay.getUTCMonth() + 1;

    const className =
      'appointment-picker__col' +
      (isSelected
        ? ' appointment-picker__col--selected'
        : ' appointment-picker__col--enabled');
    return (
      <div className={className}>
        <DayName
          dayName={dayName}
          dayNumber={dayNumber}
          monthNumber={monthNumber}
          visible={visible}
        />
        {this.props.children}
      </div>
    );
  }
}
