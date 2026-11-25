# Source of the expected results: README section 1 (authentication, role-based access, permissions
# matrix) and section 4 (a token is required; 401 = not logged in, 403 = role not allowed).
Feature: Login with role-based access
  As the safety office
  We want each person to get only the rights of their role
  So that only administrators can change the list of laboratories

  Scenario: Every role can log in, but only the admin can add a laboratory
    Given these accounts exist:
      | who        | email             | password      |
      | admin      | admin@lab.com     | Admin@123     |
      | inspector  | inspector@lab.com | Inspector@123 |
      | technician | tech@lab.com      | Tech@123      |
    When each account logs in with its email and password
    And each account and an unauthenticated visitor ask for the laboratory list
    And each account and an unauthenticated visitor try to add a laboratory
    Then every account is logged in with its own role
    And the results are:
      | who             | laboratory list | add a laboratory |
      | admin           | allowed         | allowed          |
      | inspector       | allowed         | refused with 403 |
      | technician      | allowed         | refused with 403 |
      | unauthenticated | refused with 401 | refused with 401 |
    And only the laboratory added by the admin is saved
