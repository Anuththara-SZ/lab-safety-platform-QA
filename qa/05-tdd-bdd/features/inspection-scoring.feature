# Source of the expected results: README section 1, "Scoring and risk logic".
#   score = passed / (passed + failed) x 100, N/A items are ignored
#   risk is critical if any critical item fails, else high (<60), medium (<80), low (>=80)
# Here: 4 passed, 1 failed, 1 N/A, so the score is 4 / 5 = 80. A score of 80 alone would be "low".
Feature: Inspection scoring and risk level
  As a laboratory inspector
  I want a failed critical item to give critical risk
  So that a dangerous laboratory is not hidden by a good score

  Scenario: One failed critical item gives critical risk even when the score is 80
    Given the admin has created a checklist with these items:
      | item                              | category    | critical |
      | Fire extinguishers are charged    | Fire Safety | yes      |
      | Emergency exits are clear         | Emergency   | yes      |
      | First aid kit is stocked          | Emergency   | no       |
      | Power cables are not damaged      | Electrical  | no       |
      | PPE is available                  | PPE         | no       |
      | Hazardous waste is segregated     | Waste       | no       |
    And the inspector has scheduled an inspection with this checklist
    When the inspector submits these answers:
      | item                              | result | remarks                         |
      | Fire extinguishers are charged    | fail   | Two extinguishers are empty     |
      | Emergency exits are clear         | pass   |                                 |
      | First aid kit is stocked          | pass   |                                 |
      | Power cables are not damaged      | pass   |                                 |
      | PPE is available                  | pass   |                                 |
      | Hazardous waste is segregated     | na     |                                 |
    Then the saved inspection is "completed"
    And the saved score is 80
    And the saved risk level is "critical"
    And the laboratory shows 80 as its last score
